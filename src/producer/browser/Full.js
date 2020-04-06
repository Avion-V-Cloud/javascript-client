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

import logFactory from '../../utils/logger';
import TaskFactory from '../task';
import SplitChangesUpdater from '../updater/SplitChanges';
import MySegmentsUpdater from '../updater/MySegments';
import onSplitsArrivedFactory from './onSplitsArrivedFactory';

const log = logFactory('splitio-producer:updater');

/**
 * Startup all the background jobs required for a Browser SDK instance.
 */
const FullBrowserProducer = (context) => {
  const splitsUpdater = SplitChangesUpdater(context);
  const segmentsUpdater = MySegmentsUpdater(context);

  let isSynchronizeSplitsRunning = false;

  function synchronizeSplits() {
    isSynchronizeSplitsRunning = true;
    return splitsUpdater().finally(function() {
      isSynchronizeSplitsRunning = false;
    });
  }

  let isSynchronizeMySegmentsRunning = false;

  function synchronizeMySegments(segmentList) {
    isSynchronizeMySegmentsRunning = true;
    return segmentsUpdater(undefined, segmentList).finally(function () {
      isSynchronizeMySegmentsRunning = false;
    });
  }

  const settings = context.get(context.constants.SETTINGS);
  const { splits: splitsEventEmitter } = context.get(context.constants.READINESS);

  const splitsUpdaterTask = TaskFactory(synchronizeSplits, settings.scheduler.featuresRefreshRate);
  const segmentsUpdaterTask = TaskFactory(segmentsUpdater, settings.scheduler.segmentsRefreshRate);

  const onSplitsArrived = onSplitsArrivedFactory(segmentsUpdaterTask, context);

  splitsEventEmitter.on(splitsEventEmitter.SDK_SPLITS_ARRIVED, onSplitsArrived);

  return {
    start() {
      log.info('Starting BROWSER producer');

      splitsUpdaterTask.start();
      segmentsUpdaterTask.start();
    },

    stop() {
      log.info('Stopping BROWSER producer');

      splitsUpdaterTask.stop();
      segmentsUpdaterTask && segmentsUpdaterTask.stop();
    },

    // Used by SyncManager to know if running in polling mode.
    isRunning: splitsUpdaterTask.isRunning,

    // Used by splitsSync
    isSynchronizeSplitsRunning() {
      return isSynchronizeSplitsRunning;
    },
    synchronizeSplits,

    // Used by MySegmentUpdateWorker
    isSynchronizeMySegmentsRunning() {
      return isSynchronizeMySegmentsRunning;
    },
    synchronizeMySegments,
  };
};

export default FullBrowserProducer;