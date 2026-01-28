import { randomUUID } from "node:crypto";

export class UiCommandBroker {
  /**
   * @param {{logger?: any, activeMaxAgeMs?: number}} options
   */
  constructor(options = {}) {
    this.log = options.logger ?? console;
    this.activeMaxAgeMs = options.activeMaxAgeMs ?? 30_000;

    /** @type {Map<string, {clientId: string, lastSeenAt: number}>} */
    this._clients = new Map();

    /** @type {string|null} */
    this._activeClientId = null;

    /** @type {Map<string, Array<{id: string, type: string, payload: any, createdAt: number}>>} */
    this._queuesByClientId = new Map();

    /** @type {Map<string, Array<{resolve: (cmd: any|null) => void, timeoutHandle: any}>>} */
    this._pendingPollsByClientId = new Map();

    /** @type {Map<string, {resolve: (r: any) => void, timeoutHandle: any, createdAt: number}>} */
    this._pendingResultsByCommandId = new Map();
  }

  /**
   * @param {string} clientId
   * @returns {{ok: true, activeClientId: string}}
   */
  markClientActive(clientId) {
    const now = Date.now();
    this._clients.set(clientId, { clientId, lastSeenAt: now });
    this._activeClientId = clientId;
    return { ok: true, activeClientId: clientId };
  }

  /**
   * @returns {{ok: true, clientId: string} | {ok: false, error: string}}
   */
  getActiveClient() {
    const clientId = this._activeClientId;
    if (!clientId) return { ok: false, error: "ui_client_not_connected" };

    const meta = this._clients.get(clientId);
    if (!meta) return { ok: false, error: "ui_client_not_connected" };

    const now = Date.now();
    if (now - meta.lastSeenAt > this.activeMaxAgeMs) {
      this._activeClientId = null;
      return { ok: false, error: "ui_client_not_connected" };
    }

    return { ok: true, clientId };
  }

  /**
   * @param {string} clientId
   * @param {{type: string, payload: any}} command
   * @returns {{ok: true, commandId: string}}
   */
  enqueueCommand(clientId, command) {
    const cmd = {
      id: randomUUID(),
      type: command.type,
      payload: command.payload,
      createdAt: Date.now()
    };

    const pendingPolls = this._pendingPollsByClientId.get(clientId);
    if (pendingPolls && pendingPolls.length > 0) {
      const waiter = pendingPolls.shift();
      if (waiter) {
        clearTimeout(waiter.timeoutHandle);
        waiter.resolve(cmd);
        return { ok: true, commandId: cmd.id };
      }
    }

    const q = this._queuesByClientId.get(clientId) ?? [];
    q.push(cmd);
    this._queuesByClientId.set(clientId, q);
    return { ok: true, commandId: cmd.id };
  }

  /**
   * @param {{type: string, payload: any}} command
   * @returns {{ok: true, commandId: string} | {ok: false, error: string}}
   */
  enqueueToActive(command) {
    const active = this.getActiveClient();
    if (!active.ok) return active;
    return this.enqueueCommand(active.clientId, command);
  }

  /**
   * @param {string} clientId
   * @param {number} timeoutMs
   * @returns {Promise<{id: string, type: string, payload: any} | null>}
   */
  waitForNextCommand(clientId, timeoutMs) {
    this.markClientActive(clientId);

    const q = this._queuesByClientId.get(clientId);
    if (q && q.length > 0) {
      return Promise.resolve(q.shift() ?? null);
    }

    const waiters = this._pendingPollsByClientId.get(clientId) ?? [];

    return new Promise((resolve) => {
      const timeoutHandle = setTimeout(() => {
        const current = this._pendingPollsByClientId.get(clientId) ?? [];
        const idx = current.findIndex((w) => w.resolve === resolve);
        if (idx >= 0) current.splice(idx, 1);
        this._pendingPollsByClientId.set(clientId, current);
        resolve(null);
      }, Math.max(0, timeoutMs));

      waiters.push({ resolve, timeoutHandle });
      this._pendingPollsByClientId.set(clientId, waiters);
    });
  }

  /**
   * @param {string} commandId
   * @param {number} timeoutMs
   * @returns {Promise<any>}
   */
  waitForResult(commandId, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this._pendingResultsByCommandId.delete(commandId);
        reject(Object.assign(new Error("ui_timeout"), { code: "ui_timeout", commandId }));
      }, Math.max(0, timeoutMs));

      this._pendingResultsByCommandId.set(commandId, { resolve, timeoutHandle, createdAt: Date.now() });
    });
  }

  /**
   * @param {string} commandId
   * @param {{ok: boolean, result?: any, error?: any}} payload
   * @returns {{ok: true} | {ok: false, error: string}}
   */
  resolveResult(commandId, payload) {
    const pending = this._pendingResultsByCommandId.get(commandId);
    if (!pending) return { ok: false, error: "command_not_pending" };

    clearTimeout(pending.timeoutHandle);
    this._pendingResultsByCommandId.delete(commandId);
    pending.resolve(payload);
    return { ok: true };
  }
}

