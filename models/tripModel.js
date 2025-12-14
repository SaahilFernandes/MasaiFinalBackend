const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Can be unassigned initially
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'ongoing', 'completed', 'cancelled'],
      default: 'pending',
    },
    totalAmount: { type: Number, required: true },
    isDeleted: { type: Boolean, default: false, select: false },
  },
  { timestamps: true }
);

const Trip = mongoose.model('Trip', tripSchema);
module.exports = Trip;