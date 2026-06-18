const express = require('express');
const router = express.Router();
const arenaController = require('./arena.controller');
const { authenticate } = require('../../middleware/auth.middleware');

// --- Visitors Endpoints ---
router.get('/visitors', authenticate, arenaController.getVisitors);
router.post('/visitors', authenticate, arenaController.createVisitor);
router.put('/visitors/:id', authenticate, arenaController.updateVisitor);
router.delete('/visitors/:id', authenticate, arenaController.deleteVisitor);

// --- Cards Endpoints ---
router.get('/cards', authenticate, arenaController.getCards);
router.get('/cards/:cardNumber', authenticate, arenaController.getCardByNumber);
router.post('/cards', authenticate, arenaController.createCard);
router.put('/cards/:cardNumber', authenticate, arenaController.updateCard);
router.delete('/cards/:cardNumber', authenticate, arenaController.deleteCard);

// --- Packages Endpoints ---
router.get('/packages', authenticate, arenaController.getPackages);
router.post('/packages', authenticate, arenaController.createPackage);
router.put('/packages/:id', authenticate, arenaController.updatePackage);
router.delete('/packages/:id', authenticate, arenaController.deletePackage);

// --- Activities Endpoints ---
router.get('/activities', authenticate, arenaController.getActivities);
router.post('/activities', authenticate, arenaController.createActivity);
router.put('/activities/:id', authenticate, arenaController.updateActivity);
router.delete('/activities/:id', authenticate, arenaController.deleteActivity);

// --- Memberships Endpoints ---
router.get('/memberships', authenticate, arenaController.getMemberships);
router.post('/memberships', authenticate, arenaController.createMembership);
router.put('/memberships/:id', authenticate, arenaController.updateMembership);
router.delete('/memberships/:id', authenticate, arenaController.deleteMembership);

// --- Staff Endpoints ---
router.get('/staff', authenticate, arenaController.getArenaStaff);
router.post('/staff', authenticate, arenaController.createArenaStaff);
router.put('/staff/:id', authenticate, arenaController.updateArenaStaff);
router.delete('/staff/:id', authenticate, arenaController.deleteArenaStaff);

// --- Settings Endpoints ---
router.get('/settings', authenticate, arenaController.getSettings);
router.put('/settings', authenticate, arenaController.updateSettings);

// --- Transactions Endpoints ---
router.get('/transactions', authenticate, arenaController.getTransactions);
router.post('/transactions', authenticate, arenaController.createTransaction);

// --- Dashboard Stats Endpoint ---
router.get('/dashboard', authenticate, arenaController.getDashboardStats);

// --- Reports Stats Endpoint ---
router.get('/reports', authenticate, arenaController.getReportsStats);

// --- Activity Sessions Endpoints ---
router.get('/activities/sessions', authenticate, arenaController.getActivitySessions);
router.post('/activities/sessions/start', authenticate, arenaController.startActivitySession);
router.post('/activities/sessions/extend', authenticate, arenaController.extendActivitySession);
router.post('/activities/sessions/end', authenticate, arenaController.endActivitySession);

module.exports = router;
