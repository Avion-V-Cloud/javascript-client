/**
Copyright 2016 Split Software

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
**/

import logFactory from '../utils/logger';
const log = logFactory('splitio-producer:updater');
import repeat from '../utils/fn/repeat';
import SplitChangesUpdater from './updater/SplitChanges';
import SegmentChangesUpdater from './updater/SegmentChanges';

/**
 * Expose start / stop mechanism for pulling data from services.
 */
const NodeUpdater = (context) => {
  const splitsUpdater = SplitChangesUpdater(context, true /* tell split updater we are in node */);
  const segmentsUpdater = SegmentChangesUpdater(context);
  const settings = context.get(context.constants.SETTINGS);

  let stopSplitsUpdate = false;
  let stopSegmentsUpdate = false;
  let splitFetchCompleted = false;
  let isRunning = false;
  let isSplitsUpdaterRunning = false;
  let isSegmentsUpdaterRunning = false;

  function callSplitsUpdater() {
    isSplitsUpdaterRunning = true;
    return splitsUpdater().then(function () {
      // Mark splits as ready (track first successfull call to start downloading segments)
      splitFetchCompleted = true;
    }).finally(function () {
      isSplitsUpdaterRunning = false;
    });
  }

  function callSegmentsUpdater(segments) {
    // @TODO update isSegmentsUpdaterRunning per segmentName
    isSegmentsUpdaterRunning = true;
    return segmentsUpdater(segments).finally(function () {
      isSegmentsUpdaterRunning = false;
    });
  }

  return {
    start() {
      log.info('Starting NODEJS updater');
      log.debug(`Splits will be refreshed each ${settings.scheduler.featuresRefreshRate} millis`);
      log.debug(`Segments will be refreshed each ${settings.scheduler.segmentsRefreshRate} millis`);

      // Schedule incremental update of segments only if needed
      const spinUpSegmentUpdater = () => {
        if (!stopSegmentsUpdate) {
          stopSegmentsUpdate = repeat(
            scheduleSegmentsUpdate => {
              if (splitFetchCompleted) {
                log.debug('Fetching segments');
                callSegmentsUpdater().then(() => scheduleSegmentsUpdate());
              } else {
                scheduleSegmentsUpdate();
              }
            },
            settings.scheduler.segmentsRefreshRate
          );
        }
      };

      stopSplitsUpdate = repeat(
        scheduleSplitsUpdate => {
          log.debug('Fetching splits');

          callSplitsUpdater()
            .then(() => {
              // Spin up the segments update if needed
              spinUpSegmentUpdater();
              // Re-schedule update
              scheduleSplitsUpdate();
            });
        },
        settings.scheduler.featuresRefreshRate
      );

      isRunning = true;
    },

    stop() {
      log.info('Stopping NODEJS updater');

      stopSplitsUpdate && stopSplitsUpdate();
      stopSegmentsUpdate && stopSegmentsUpdate();

      isRunning = false;
    },

    // Used by SyncManager to know if running in polling mode.
    isRunning() {
      return isRunning;
    },

    isSplitsUpdaterRunning() {
      return isSplitsUpdaterRunning;
    },

    callSplitsUpdater,

    isSegmentsUpdaterRunning() {
      return isSegmentsUpdaterRunning;
    },

    callSegmentsUpdater,
  };
};

export default NodeUpdater;