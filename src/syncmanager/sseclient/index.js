import getEventSource from '../../services/sse/getEventSource';

// const CONNECTING = 0;
const OPEN = 1;
// const CLOSED = 2;

// const BASE_URL = 'https://realtime.ably.io/event-stream';
const BASE_URL = 'https://realtime.ably.io/sse';
const VERSION = '1.1';

export default class SSEClient {
  static getInstance() {
    const EventSource = getEventSource();
    if (EventSource)
      return new SSEClient(EventSource);
  }

  // - Properties:
  // EventSource: EventSource constructor;
  // connection: EventSource | undefined;
  // handler: EventHandler for errors, messages and open events.

  constructor(EventSource) {
    this.EventSource = EventSource;
  }

  setEventHandler(handler) {
    this.handler = handler;
  }

  open({ token, decodedToken }) {
    // @REVIEW we can maybe remove next line, if we are properly calling sseClient.close() from Push manager
    this.close();

    // @TODO test and add error handling
    // @REVIEW url encoded
    const channels = JSON.parse(decodedToken['x-ably-capability']);
    const channelsQueryParam = Object.keys(channels).join(',');
    const url = `${BASE_URL}?channels=${channelsQueryParam}&accessToken=${token}&v=${VERSION}`;

    // @TODO set options
    const options = {};
    this.connection = new this.EventSource(url, options);

    if (this.listener) { // no need to check if SSEClient is used only by PushManager
      this.connection.onopen = this.listener.handleOpen;
      this.connection.onmessage = this.listener.handleMessage;
      this.connection.onerror = this.listener.handleError;
    }
  }

  /** Close if opened */
  close() {
    if (this.connection && this.connection.readyState === OPEN) {
      this.connection.close();
      if (this.listener) this.listener.handleClose();
    }
  }
}