const arenaService = require('./arena.service');

class ArenaController {
  // --- Visitors API ---
  async getVisitors(req, res) {
    try {
      const data = await arenaService.getVisitors();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async createVisitor(req, res) {
    try {
      const data = await arenaService.createVisitor(req.body);
      res.status(201).json({ success: true, message: 'Visitor created', data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async updateVisitor(req, res) {
    try {
      const data = await arenaService.updateVisitor(req.params.id, req.body);
      res.json({ success: true, message: 'Visitor updated', data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async deleteVisitor(req, res) {
    try {
      const success = await arenaService.deleteVisitor(req.params.id);
      if (success) {
        res.json({ success: true, message: 'Visitor deleted' });
      } else {
        res.status(404).json({ success: false, message: 'Visitor not found' });
      }
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // --- Cards API ---
  async getCards(req, res) {
    try {
      const data = await arenaService.getCards();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getCardByNumber(req, res) {
    try {
      const data = await arenaService.getCardByNumber(req.params.cardNumber);
      if (data) {
        res.json({ success: true, data });
      } else {
        res.status(404).json({ success: false, message: 'Card not found' });
      }
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async createCard(req, res) {
    try {
      const data = await arenaService.createCard(req.body);
      res.status(201).json({ success: true, message: 'Card created', data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async updateCard(req, res) {
    try {
      const data = await arenaService.updateCard(req.params.cardNumber, req.body);
      res.json({ success: true, message: 'Card updated', data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async deleteCard(req, res) {
    try {
      const success = await arenaService.deleteCard(req.params.cardNumber);
      if (success) {
        res.json({ success: true, message: 'Card deleted' });
      } else {
        res.status(404).json({ success: false, message: 'Card not found' });
      }
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // --- Packages API ---
  async getPackages(req, res) {
    try {
      const data = await arenaService.getPackages();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async createPackage(req, res) {
    try {
      const data = await arenaService.createPackage(req.body);
      res.status(201).json({ success: true, message: 'Package created', data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async updatePackage(req, res) {
    try {
      const data = await arenaService.updatePackage(req.params.id, req.body);
      res.json({ success: true, message: 'Package updated', data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async deletePackage(req, res) {
    try {
      const success = await arenaService.deletePackage(req.params.id);
      if (success) {
        res.json({ success: true, message: 'Package deleted' });
      } else {
        res.status(404).json({ success: false, message: 'Package not found' });
      }
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // --- Activities API ---
  async getActivities(req, res) {
    try {
      const data = await arenaService.getActivities();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async createActivity(req, res) {
    try {
      const data = await arenaService.createActivity(req.body);
      res.status(201).json({ success: true, message: 'Activity created', data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async updateActivity(req, res) {
    try {
      const data = await arenaService.updateActivity(req.params.id, req.body);
      res.json({ success: true, message: 'Activity updated', data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async deleteActivity(req, res) {
    try {
      const success = await arenaService.deleteActivity(req.params.id);
      if (success) {
        res.json({ success: true, message: 'Activity deleted' });
      } else {
        res.status(404).json({ success: false, message: 'Activity not found' });
      }
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // --- Memberships API ---
  async getMemberships(req, res) {
    try {
      const data = await arenaService.getMemberships();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async createMembership(req, res) {
    try {
      const data = await arenaService.createMembership(req.body);
      res.status(201).json({ success: true, message: 'Membership tier created', data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async updateMembership(req, res) {
    try {
      const data = await arenaService.updateMembership(req.params.id, req.body);
      res.json({ success: true, message: 'Membership tier updated', data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async deleteMembership(req, res) {
    try {
      const success = await arenaService.deleteMembership(req.params.id);
      if (success) {
        res.json({ success: true, message: 'Membership tier deleted' });
      } else {
        res.status(404).json({ success: false, message: 'Membership tier not found' });
      }
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // --- Staff API ---
  async getArenaStaff(req, res) {
    try {
      const data = await arenaService.getArenaStaff();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async createArenaStaff(req, res) {
    try {
      const data = await arenaService.createArenaStaff(req.body);
      res.status(201).json({ success: true, message: 'Arena staff member added', data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async updateArenaStaff(req, res) {
    try {
      const data = await arenaService.updateArenaStaff(req.params.id, req.body);
      res.json({ success: true, message: 'Arena staff member updated', data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async deleteArenaStaff(req, res) {
    try {
      const success = await arenaService.deleteArenaStaff(req.params.id);
      if (success) {
        res.json({ success: true, message: 'Arena staff member removed' });
      } else {
        res.status(404).json({ success: false, message: 'Arena staff member not found' });
      }
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // --- Settings API ---
  async getSettings(req, res) {
    try {
      const data = await arenaService.getSettings();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async updateSettings(req, res) {
    try {
      const data = await arenaService.updateSettings(req.body);
      res.json({ success: true, message: 'Arena settings updated', data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // --- Transactions API ---
  async getTransactions(req, res) {
    try {
      const data = await arenaService.getTransactions();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async createTransaction(req, res) {
    try {
      const data = await arenaService.createTransaction(req.body);
      res.status(201).json({ success: true, message: 'Transaction recorded', data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // --- Dashboard Stats API ---
  async getDashboardStats(req, res) {
    try {
      const data = await arenaService.getDashboardStats();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // --- Reports Stats API ---
  async getReportsStats(req, res) {
    try {
      const data = await arenaService.getReportsStats();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // --- Activity Sessions API ---
  async getActivitySessions(req, res) {
    try {
      const data = await arenaService.getActivitySessions();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async startActivitySession(req, res) {
    try {
      const { cardUid, activityId } = req.body;
      if (!cardUid || !activityId) {
        return res.status(400).json({ success: false, message: 'Card UID and Activity ID are required' });
      }
      const data = await arenaService.startActivitySession(cardUid, activityId);
      res.status(201).json({ success: true, message: 'Activity session started successfully', data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async extendActivitySession(req, res) {
    try {
      const { sessionId, extensionMinutes, extensionCharge } = req.body;
      if (!sessionId || extensionMinutes === undefined || extensionCharge === undefined) {
        return res.status(400).json({ success: false, message: 'Session ID, extension minutes and charge are required' });
      }
      const data = await arenaService.extendActivitySession(sessionId, extensionMinutes, extensionCharge);
      res.json({ success: true, message: 'Activity session extended successfully', data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async endActivitySession(req, res) {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ success: false, message: 'Session ID is required' });
      }
      const data = await arenaService.endActivitySession(sessionId);
      res.json({ success: true, message: 'Activity session ended successfully', data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new ArenaController();
