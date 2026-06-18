const arenaModel = require('./arena.model');

class ArenaService {
  // Visitors Service
  async getVisitors() {
    return await arenaModel.getVisitors();
  }

  async createVisitor(visitor) {
    return await arenaModel.createVisitor(visitor);
  }

  async updateVisitor(id, visitor) {
    return await arenaModel.updateVisitor(id, visitor);
  }

  async deleteVisitor(id) {
    return await arenaModel.deleteVisitor(id);
  }

  // Cards Service
  async getCards() {
    return await arenaModel.getCards();
  }

  async getCardByNumber(cardNumber) {
    return await arenaModel.getCardByNumber(cardNumber);
  }

  async createCard(card) {
    return await arenaModel.createCard(card);
  }

  async updateCard(cardNumber, card) {
    return await arenaModel.updateCard(cardNumber, card);
  }

  async deleteCard(cardNumber) {
    return await arenaModel.deleteCard(cardNumber);
  }

  // Packages Service
  async getPackages() {
    return await arenaModel.getPackages();
  }

  async createPackage(pkg) {
    return await arenaModel.createPackage(pkg);
  }

  async updatePackage(id, pkg) {
    return await arenaModel.updatePackage(id, pkg);
  }

  async deletePackage(id) {
    return await arenaModel.deletePackage(id);
  }

  // Activities Service
  async getActivities() {
    return await arenaModel.getActivities();
  }

  async createActivity(activity) {
    return await arenaModel.createActivity(activity);
  }

  async updateActivity(id, activity) {
    return await arenaModel.updateActivity(id, activity);
  }

  async deleteActivity(id) {
    return await arenaModel.deleteActivity(id);
  }

  // Memberships Service
  async getMemberships() {
    return await arenaModel.getMemberships();
  }

  async createMembership(membership) {
    return await arenaModel.createMembership(membership);
  }

  async updateMembership(id, membership) {
    return await arenaModel.updateMembership(id, membership);
  }

  async deleteMembership(id) {
    return await arenaModel.deleteMembership(id);
  }

  // Staff Service
  async getArenaStaff() {
    return await arenaModel.getArenaStaff();
  }

  async createArenaStaff(staff) {
    return await arenaModel.createArenaStaff(staff);
  }

  async updateArenaStaff(id, staff) {
    return await arenaModel.updateArenaStaff(id, staff);
  }

  async deleteArenaStaff(id) {
    return await arenaModel.deleteArenaStaff(id);
  }

  // Settings Service
  async getSettings() {
    return await arenaModel.getSettings();
  }

  async updateSettings(settings) {
    return await arenaModel.updateSettings(settings);
  }

  // Transactions Service
  async getTransactions() {
    return await arenaModel.getTransactions();
  }

  async createTransaction(txn) {
    return await arenaModel.createTransaction(txn);
  }

  // Dashboard Stats
  async getDashboardStats() {
    return await arenaModel.getDashboardStats();
  }

  // Reports Stats
  async getReportsStats() {
    return await arenaModel.getReportsStats();
  }

  // Activity Sessions Service
  async getActivitySessions() {
    return await arenaModel.getActivitySessions();
  }

  async startActivitySession(cardUid, activityId) {
    return await arenaModel.startActivitySession(cardUid, activityId);
  }

  async extendActivitySession(sessionId, extensionMinutes, extensionCharge) {
    return await arenaModel.extendActivitySession(sessionId, extensionMinutes, extensionCharge);
  }

  async endActivitySession(sessionId) {
    return await arenaModel.endActivitySession(sessionId);
  }
}

module.exports = new ArenaService();
