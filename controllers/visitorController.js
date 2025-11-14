const Visitor = require('../models/Visitor');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Show visitor registration page
exports.showRegisterVisitor = async (req, res) => {
  try {
    const visitors = await Visitor.find({ registeredBy: req.session.authUser.id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    res.render('visitor_register', { 
      visitors, 
      error: null, 
      success: null,
      floors: [1, 2, 3, 4]
    });
  } catch (err) {
    console.error('Error loading visitor registration:', err);
    res.render('visitor_register', { 
      visitors: [], 
      error: 'Failed to load visitors', 
      success: null,
      floors: [1, 2, 3, 4]
    });
  }
};

// Register a new visitor
exports.registerVisitor = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      registeredFor,
      floor,
      purpose,
      expectedArrival,
      expectedDeparture,
      notes
    } = req.body;

    // Validation
    if (!name || !phone || !registeredFor || !floor || !purpose || !expectedArrival || !expectedDeparture) {
      return res.render('visitor_register', {
        visitors: [],
        error: 'All required fields must be filled',
        success: null,
        floors: [1, 2, 3, 4]
      });
    }

    // Check if user has reached max visitors limit
    const visitorCount = await Visitor.countDocuments({ 
      registeredBy: req.session.authUser.id,
      status: { $in: ['pending', 'approved'] }
    });

    const maxVisitors = req.app.get('visitorSettings').maxVisitorsPerPerson;
    if (visitorCount >= maxVisitors) {
      return res.render('visitor_register', {
        visitors: [],
        error: `You can only register up to ${maxVisitors} visitors at a time`,
        success: null,
        floors: [1, 2, 3, 4]
      });
    }

    // Create visitor
    const visitor = new Visitor({
      name,
      phone,
      email,
      registeredBy: req.session.authUser.id,
      registeredFor,
      floor: parseInt(floor),
      purpose,
      expectedArrival: new Date(expectedArrival),
      expectedDeparture: new Date(expectedDeparture),
      notes
    });

    await visitor.save();

    // Log the action
    await AuditLog.create({
      action: `Registered visitor: ${name} for ${registeredFor} on Floor ${floor}`,
      floor: parseInt(floor),
      performedBy: req.session.authUser.username,
      details: `Purpose: ${purpose}, Arrival: ${expectedArrival}, Departure: ${expectedDeparture}`
    });

    res.redirect('/visitors?success=' + encodeURIComponent(`Visitor ${name} registered successfully! Access Code: ${visitor.accessCode}`));
  } catch (err) {
    console.error('Error registering visitor:', err);
    res.render('visitor_register', {
      visitors: [],
      error: 'Failed to register visitor',
      success: null,
      floors: [1, 2, 3, 4]
    });
  }
};

// Show visitor management page (admin only)
exports.showVisitorManagement = async (req, res) => {
  try {
    const status = req.query.status || 'all';
    let query = {};
    
    if (status !== 'all') {
      query.status = status;
    }

    const visitors = await Visitor.find(query)
      .populate('registeredBy', 'username')
      .populate('approvedBy', 'username')
      .sort({ createdAt: -1 })
      .lean();

    const stats = {
      pending: await Visitor.countDocuments({ status: 'pending' }),
      approved: await Visitor.countDocuments({ status: 'approved' }),
      denied: await Visitor.countDocuments({ status: 'denied' }),
      expired: await Visitor.countDocuments({ status: 'expired' })
    };

    res.render('visitor_management', { visitors, stats, currentStatus: status });
  } catch (err) {
    console.error('Error loading visitor management:', err);
    res.status(500).send('Failed to load visitor management');
  }
};

// Approve/deny visitor
exports.updateVisitorStatus = async (req, res) => {
  try {
    const { visitorId } = req.params;
    const { status, notes } = req.body;

    const visitor = await Visitor.findById(visitorId);
    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    visitor.status = status;
    if (status === 'approved') {
      visitor.approvedBy = req.session.authUser.id;
      visitor.approvedAt = new Date();
    }
    if (notes) {
      visitor.notes = notes;
    }

    await visitor.save();

    // Log the action
    await AuditLog.create({
      action: `${status} visitor: ${visitor.name}`,
      floor: visitor.floor,
      performedBy: req.session.authUser.username,
      details: notes || `Status changed to ${status}`
    });

    res.json({ success: true, message: `Visitor ${status} successfully` });
  } catch (err) {
    console.error('Error updating visitor status:', err);
    res.status(500).json({ error: 'Failed to update visitor status' });
  }
};

// Check visitor access code
exports.checkVisitorAccess = async (req, res) => {
  try {
    const { accessCode } = req.body;

    const visitor = await Visitor.findOne({ accessCode: accessCode.toUpperCase() });
    if (!visitor) {
      return res.json({ valid: false, message: 'Invalid access code' });
    }

    if (visitor.status !== 'approved') {
      return res.json({ valid: false, message: 'Visitor not approved' });
    }

    if (visitor.isExpired()) {
      return res.json({ valid: false, message: 'Visitor access has expired' });
    }

    // Mark actual arrival if not already marked
    if (!visitor.actualArrival) {
      visitor.actualArrival = new Date();
      await visitor.save();
    }

    return res.json({
      valid: true,
      visitor: {
        name: visitor.name,
        registeredFor: visitor.registeredFor,
        floor: visitor.floor,
        purpose: visitor.purpose
      }
    });
  } catch (err) {
    console.error('Error checking visitor access:', err);
    res.status(500).json({ error: 'Failed to check visitor access' });
  }
};

// Get current visitors for a floor
exports.getCurrentVisitors = async (req, res) => {
  try {
    const { floor } = req.params;
    
    const visitors = await Visitor.find({
      floor: parseInt(floor),
      status: 'approved',
      expectedArrival: { $lte: new Date() },
      expectedDeparture: { $gte: new Date() }
    }).lean();

    res.json({ visitors });
  } catch (err) {
    console.error('Error getting current visitors:', err);
    res.status(500).json({ error: 'Failed to get current visitors' });
  }
};
