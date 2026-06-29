export class CoverLoadCoordinator {
  constructor() {
    this.requests = new Map();
  }

  begin(cardId, mediaId) {
    const previous = this.requests.get(cardId);
    const request = {
      cardId,
      mediaId: mediaId ?? null,
      revision: (previous?.revision ?? 0) + 1,
    };
    this.requests.set(cardId, request);
    return request;
  }

  cancel(cardId) {
    return this.begin(cardId, null);
  }

  isCurrent(request) {
    if (!request) return false;
    const current = this.requests.get(request.cardId);
    return Boolean(
      current
      && current.revision === request.revision
      && current.mediaId === request.mediaId
    );
  }

  delete(cardId) {
    this.requests.delete(cardId);
  }

  clear() {
    this.requests.clear();
  }
}

export default CoverLoadCoordinator;
