export class MeService {
  #meRepository;

  constructor({ meRepository }) {
    this.#meRepository = meRepository;
  }

  async listParticipating(userId, query) {
    return this.#meRepository.listParticipating(userId, query);
  }

  async listCompleted(userId, query) {
    return this.#meRepository.listCompleted(userId, query);
  }

  async listMyApplications(userId, query) {
    return this.#meRepository.listMyApplications(userId, query);
  }
}
