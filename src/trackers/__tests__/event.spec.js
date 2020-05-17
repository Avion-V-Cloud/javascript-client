import tape from 'tape-catch';
import sinon from 'sinon';
import EventTracker from '../event';
import { STORAGE, INTEGRATIONS_MANAGER } from '../../utils/context/constants';

/* Mocks start */
const generateContextMocks = () => {
  // We are only mocking the pieces we care about
  const fakeStorage = {
    events: {
      track: sinon.stub()
    }
  };
  const fakeIntegrationsManager = {
    handleEvent: sinon.stub()
  };

  return {
    fakeStorage,
    fakeIntegrationsManager
  };
};

class ContextMock {
  constructor(fakeStorage, fakeIntegrationsManager) {
    this.constants = {
      STORAGE,
      INTEGRATIONS_MANAGER,
    };

    this.fakeStorage = fakeStorage;
    this.fakeIntegrationsManager = fakeIntegrationsManager;
  }

  get(target) {
    switch (target) {
      case STORAGE:
        return this.fakeStorage;
      case INTEGRATIONS_MANAGER:
        return this.fakeIntegrationsManager;
      default:
        break;
    }
  }
}
/* Mocks end */

tape('Event Tracker', t => {
  t.test('Tracker API', assert => {
    assert.equal(typeof EventTracker, 'function', 'The module should return a function which acts as a factory.');

    const { fakeStorage } = generateContextMocks();
    const contextMock = new ContextMock(fakeStorage);
    const instance = EventTracker(contextMock);

    assert.equal(typeof instance.track, 'function', 'The instance should implement the track method.');
    assert.end();
  });

  t.test('Propagate the event into the event cache and integrations manager, and return its result (a boolean or a promise that resolves to boolean)', assert => {
    const { fakeStorage, fakeIntegrationsManager } = generateContextMocks();
    const fakeEvent = {
      eventTypeId: 'eventTypeId',
      trafficTypeName: 'trafficTypeName',
      value: 0,
      timestamp: Date.now(),
      key: 'matchingKey',
      properties: {
        prop1: 'prop1',
        prop2: 0,
      }
    };

    fakeStorage.events.track.withArgs(fakeEvent, 1).returns(true);
    fakeStorage.events.track.withArgs(fakeEvent, 2).returns(Promise.resolve(false));
    fakeStorage.events.track.withArgs(fakeEvent, 3).returns(Promise.resolve(true));
    const contextMock = new ContextMock(fakeStorage, fakeIntegrationsManager);

    const tracker = EventTracker(contextMock);
    const result1 = tracker.track(fakeEvent, 1);

    assert.true(fakeStorage.events.track.calledWithExactly(sinon.match.same(fakeEvent), 1), 'Should be present in the event cache.');
    assert.true(!fakeIntegrationsManager.handleEvent.calledOnce, 'The integration manager handleEvent method should not be executed synchronously.');
    assert.true(result1, true, 'Should return the value of the event cache.');

    setTimeout(() => {
      assert.true(fakeIntegrationsManager.handleEvent.calledOnceWithExactly(fakeEvent), 'A copy of the tracked event should be sent to integration manager after the timeout wrapping make it to the queue stack.');
      assert.false(fakeIntegrationsManager.handleEvent.calledOnceWithExactly(sinon.match.same(fakeEvent)), 'Should not send the original event.');

      const result2 = tracker.track(fakeEvent, 2);

      assert.true(fakeStorage.events.track.calledWithExactly(sinon.match.same(fakeEvent), 2), 'Should be present in the event cache.');

      result2.then(tracked => {
        assert.equal(tracked, false, 'Should return the value of the event cache resolved promise.');

        setTimeout(() => {
          assert.true(fakeIntegrationsManager.handleEvent.calledOnce, 'Untracked event should not be sent to integration manager.');

          const result3 = tracker.track(fakeEvent, 3);

          assert.true(fakeStorage.events.track.calledWithExactly(sinon.match.same(fakeEvent), 3), 'Should be present in the event cache.');

          result3.then(tracked => {
            assert.false(fakeIntegrationsManager.handleEvent.calledTwice, 'Tracked event should not be sent to integration manager synchronously');
            assert.equal(tracked, true, 'Should return the value of the event cache resolved promise.');

            setTimeout(() => {
              assert.true(fakeIntegrationsManager.handleEvent.getCalls()[1].calledWithExactly(fakeEvent), 'A copy of tracked event should be sent to integration manager after the timeout wrapping make it to the queue stack.');
              assert.false(fakeIntegrationsManager.handleEvent.getCalls()[1].calledWithExactly(sinon.match.same(fakeEvent)), 'Should not send the original event.');
              assert.end();
            }, 0);
          });

        }, 0);
      });
    }, 0);
  });

});
