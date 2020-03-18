// Although we are testing integrations/browser.js, this is a "node" test suite
// because we need proxyquire to mock SplitToGa and GaToSplit.

import tape from 'tape';
import sinon from 'sinon';
import proxyquire from 'proxyquire';
import { GOOGLE_ANALYTICS_TO_SPLIT, SPLIT_TO_GOOGLE_ANALYTICS } from '../../utils/constants';
import { SPLIT_IMPRESSION, SPLIT_EVENT } from '../../utils/constants';
const proxyquireStrict = proxyquire.noCallThru();

const GaToSplitMock = sinon.stub();
const SplitToGaQueueMethod = sinon.stub();
const SplitToGaMock = sinon.stub().callsFake(() => {
  return {
    queue: SplitToGaQueueMethod
  };
});

function resetStubs() {
  GaToSplitMock.resetHistory();
  SplitToGaQueueMethod.resetHistory();
  SplitToGaMock.resetHistory();
}

// Import the module, mocking integration modules (GaToSplit and SplitToGa).
const browserIMF = proxyquireStrict('../browser', {
  './ga/GaToSplit': GaToSplitMock,
  './ga/SplitToGa': SplitToGaMock,
}).default;

class ContextMock {
  constructor(fakeStorage, fakeSettings) {
    this.constants = {
      STORAGE: 'storage',
      SETTINGS: 'settings'
    };

    this.fakeStorage = fakeStorage;
    this.fakeSettings = fakeSettings;
  }

  get(target) {
    switch (target) {
      case 'storage':
        return this.fakeStorage;
      case 'settings':
        return this.fakeSettings;
      default:
        break;
    }
  }
}

tape('IntegrationsManagerFactory for browser', t => {

  t.test('API', assert => {
    assert.equal(typeof browserIMF, 'function', 'The module should return a function which acts as a factory.');

    const contextMock1 = new ContextMock(null, { integrations: [] });
    const instance1 = browserIMF(contextMock1);
    assert.equal(instance1, undefined, 'The instance should be undefined if settings.integrations does not contain integrations that register a listener.');

    const contextMock2 = new ContextMock(null, { integrations: [{ type: GOOGLE_ANALYTICS_TO_SPLIT }, { type: SPLIT_TO_GOOGLE_ANALYTICS }] });
    const instance2 = browserIMF(contextMock2);
    assert.true(GaToSplitMock.calledOnce, 'GaToSplit invoked once');
    assert.true(SplitToGaMock.calledOnce, 'SplitToGa invoked once');
    assert.equal(typeof instance2.handleImpression, 'function', 'The instance should implement the handleImpression method if settings.integrations has items that register a listener.');
    assert.equal(typeof instance2.handleEvent, 'function', 'The instance should implement the handleEvent method if settings.integrations has items that register a listener.');

    resetStubs();

    const contextMock3 = new ContextMock(null, { integrations:
      [{ type: GOOGLE_ANALYTICS_TO_SPLIT }, { type: SPLIT_TO_GOOGLE_ANALYTICS }, { type: GOOGLE_ANALYTICS_TO_SPLIT }, { type: SPLIT_TO_GOOGLE_ANALYTICS }, { type: SPLIT_TO_GOOGLE_ANALYTICS }] });
    browserIMF(contextMock3);
    assert.true(GaToSplitMock.calledTwice, 'GaToSplit invoked twice');
    assert.true(SplitToGaMock.calledThrice, 'SplitToGa invoked thrice');

    resetStubs();
    assert.end();
  });

  t.test('Interaction with GaToSplit integration module', assert => {
    const coreSetting = { key: 'emiliano', trafficType: 'user' };
    const gaToSplitOptions = {
      type: 'GOOGLE_ANALYTICS_TO_SPLIT',
      param1: 'param1',
      param2: 'param2',
    };
    const fakeStorage = 'fakeStorage';
    const contextMock = new ContextMock(fakeStorage, { core: coreSetting, integrations: [gaToSplitOptions] });
    browserIMF(contextMock);

    assert.true(GaToSplitMock.calledOnceWith(gaToSplitOptions, fakeStorage, coreSetting), 'Invokes GaToSplit integration module with options, storage and core settings');

    resetStubs();
    assert.end();
  });

  t.test('Interaction with SplitToGa integration module', assert => {
    const splitToGaOptions = {
      type: 'SPLIT_TO_GOOGLE_ANALYTICS',
      param1: 'param1',
      param2: 'param2',
    };
    const contextMock = new ContextMock(null, { integrations: [splitToGaOptions] });
    const instance = browserIMF(contextMock);

    assert.true(SplitToGaMock.calledOnceWith(splitToGaOptions), 'Invokes SplitToGa integration module with options');

    const fakeImpression = 'fake';
    instance.handleImpression(fakeImpression);
    assert.true(SplitToGaQueueMethod.calledOnceWith({ payload: fakeImpression, type: SPLIT_IMPRESSION }), 'Invokes SplitToGa.queue method with tracked impression');

    resetStubs();

    const fakeEvent = 'fake';
    instance.handleEvent(fakeEvent);
    assert.true(SplitToGaQueueMethod.calledOnceWith({ payload: fakeEvent, type: SPLIT_EVENT }), 'Invokes SplitToGa.queue method with tracked event');

    resetStubs();
    assert.end();
  });
});