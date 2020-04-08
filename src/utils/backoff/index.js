class Backoff {

  /**
   * Schedule function calls with exponential backoff
   *
   * @param {function} cb
   * @param {number} baseMillis
   * @param {number} maxMillis
   */
  constructor(cb, baseMillis, maxMillis) {
    this.baseMillis = baseMillis || Backoff.DEFAULT_BASE_MILLIS;
    this.maxMillis = maxMillis || Backoff.DEFAULT_MAX_MILLIS;
    this.attempts = 0;
    this.cb = cb;
  }

  scheduleCall() {
    let delayInMillis = this.baseMillis * Math.pow(2, this.attempts);
    if (delayInMillis > this.maxMillis) delayInMillis = this.maxMillis;
    if (this.timeoutID) clearTimeout(this.timeoutID);
    this.timeoutID = setTimeout(() => {
      this.cb();
    }, delayInMillis);
    this.attempts++;
  }

  reset() {
    this.attempts = 0;
    if (this.timeoutID) clearTimeout(this.timeoutID);
  }

}

Backoff.DEFAULT_BASE_MILLIS = 1000; // 1 second
Backoff.DEFAULT_MAX_MILLIS = 1800000; // 30 minutes

export default Backoff;