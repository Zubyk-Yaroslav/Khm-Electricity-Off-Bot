class SubsManager {
  constructor() {
    this.subscribers = new Map();
  }

  replaceAll(newMap) {
    this.subscribers = newMap;
  }

  replace(chatId, data) {
    this.subscribers.set(chatId, data);
  }

  getAll() {
    return this.subscribers;
  }

  get(chatId) {
    return this.subscribers.get(chatId);
  }

  clear() {
    this.subscribers.clear();
  }

  set(chatId, data) {
    return this.subscribers.set(chatId, data);
  }

  delete(chatId) {
    this.subscribers.delete(chatId);
  }

  entries() {
    return this.subscribers.entries();
  }

  size() {
    return this.subscribers.size;
  }

  has(chatId) {
    return this.subscribers.has(chatId);
  }

  lastImageUrl(chatId) {
    return this.subscribers?.get(chatId)?.lastImageUrl;
  }
}

export default new SubsManager();
