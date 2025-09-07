#!/usr/bin/env node

/**
 * Seed Data Script for AppointifyX
 * Creates sample tenants, users, and appointments for demonstration
 */

const { DynamoDB } = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new DynamoDB.DocumentClient();

// Configuration
const CONFIG = {
  region: process.env.AWS_REGION || 'us-east-1',
  appointmentsTable: process.env.APPOINTMENTS_TABLE_NAME || 'appointifyx-appointments-dev',
  tenantsTable: process.env.TENANTS_TABLE_NAME || 'appointifyx-tenants-dev',
  usersTable: process.env.USERS_TABLE_NAME || 'appointifyx-users-dev'
};

// Sample data
const SAMPLE_TENANTS = [
  {
    tenantId: 'tenant-001',
    name: 'Acme Corporation',
    domain: 'acme.com',
    plan: 'premium',
    status: 'active',
    createdAt: new Date().toISOString(),
    settings: {
      timezone: 'America/New_York',
      workingHours: {
        start: '09:00',
        end: '17:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      }
    }
  },
  {
    tenantId: 'tenant-002',
    name: 'TechStart Inc',
    domain: 'techstart.io',
    plan: 'basic',
    status: 'active',
    createdAt: new Date().toISOString(),
    settings: {
      timezone: 'America/Los_Angeles',
      workingHours: {
        start: '08:00',
        end: '18:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      }
    }
  }
];

const SAMPLE_USERS = [
  {
    userId: 'user-001',
    tenantId: 'tenant-001',
    email: 'admin@acme.com',
    name: 'John Admin',
    role: 'tenant-admin',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    userId: 'user-002',
    tenantId: 'tenant-001',
    email: 'user@acme.com',
    name: 'Jane User',
    role: 'tenant-user',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    userId: 'user-003',
    tenantId: 'tenant-002',
    email: 'admin@techstart.io',
    name: 'Bob Manager',
    role: 'tenant-admin',
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

const SAMPLE_APPOINTMENTS = [
  {
    appointmentId: uuidv4(),
    tenantId: 'tenant-001',
    userId: 'user-001',
    title: 'Client Meeting',
    description: 'Quarterly business review with key client',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
    location: 'Conference Room A',
    attendees: ['client@example.com'],
    status: 'scheduled',
    reminderMinutes: 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    appointmentId: uuidv4(),
    tenantId: 'tenant-001',
    userId: 'user-002',
    title: 'Team Standup',
    description: 'Daily team synchronization meeting',
    startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // Day after tomorrow + 30 min
    location: 'Virtual',
    attendees: ['team@acme.com'],
    status: 'confirmed',
    reminderMinutes: 15,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    appointmentId: uuidv4(),
    tenantId: 'tenant-002',
    userId: 'user-003',
    title: 'Product Demo',
    description: 'Demonstration of new product features',
    startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(), // 3 days from now + 90 min
    location: 'Demo Room',
    attendees: ['investor@example.com', 'stakeholder@example.com'],
    status: 'scheduled',
    reminderMinutes: 120,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Utility functions
function createDynamoDBItem(tableName, item) {
  const params = {
    TableName: tableName,
    Item: item
  };

  return dynamodb.put(params).promise();
}

function createAppointmentItem(appointment) {
  const startDate = new Date(appointment.startTime);
  const dateStr = startDate.toISOString().split('T')[0];
  const timeStr = startDate.toTimeString().split(' ')[0];

  return {
    PK: `TENANT#${appointment.tenantId}#APPOINTMENT#${appointment.appointmentId}`,
    SK: `APPOINTMENT#${appointment.appointmentId}`,
    GSI1PK: `TENANT#${appointment.tenantId}`,
    GSI1SK: `DATE#${dateStr}#TIME#${timeStr}`,
    GSI2PK: `TENANT#${appointment.tenantId}#USER#${appointment.userId}`,
    GSI2SK: `DATE#${dateStr}#TIME#${timeStr}`,
    ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year TTL
    ...appointment
  };
}

// Main seeding function
async function seedData() {
  console.log('🌱 Starting data seeding...');
  console.log(`📍 Region: ${CONFIG.region}`);
  console.log(`📊 Tables: ${CONFIG.appointmentsTable}, ${CONFIG.tenantsTable}, ${CONFIG.usersTable}`);

  try {
    // Seed tenants
    console.log('\n🏢 Seeding tenants...');
    for (const tenant of SAMPLE_TENANTS) {
      await createDynamoDBItem(CONFIG.tenantsTable, tenant);
      console.log(`✅ Created tenant: ${tenant.name} (${tenant.tenantId})`);
    }

    // Seed users
    console.log('\n👥 Seeding users...');
    for (const user of SAMPLE_USERS) {
      await createDynamoDBItem(CONFIG.usersTable, user);
      console.log(`✅ Created user: ${user.name} (${user.email})`);
    }

    // Seed appointments
    console.log('\n📅 Seeding appointments...');
    for (const appointment of SAMPLE_APPOINTMENTS) {
      const appointmentItem = createAppointmentItem(appointment);
      await createDynamoDBItem(CONFIG.appointmentsTable, appointmentItem);
      console.log(`✅ Created appointment: ${appointment.title} (${appointment.appointmentId})`);
    }

    console.log('\n🎉 Data seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - ${SAMPLE_TENANTS.length} tenants created`);
    console.log(`   - ${SAMPLE_USERS.length} users created`);
    console.log(`   - ${SAMPLE_APPOINTMENTS.length} appointments created`);

    console.log('\n🔑 Demo Credentials:');
    console.log('   Tenant 1 (Acme Corp):');
    console.log('     - Admin: admin@acme.com');
    console.log('     - User: user@acme.com');
    console.log('   Tenant 2 (TechStart):');
    console.log('     - Admin: admin@techstart.io');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

// Run the seeding
if (require.main === module) {
  seedData();
}

module.exports = { seedData, SAMPLE_TENANTS, SAMPLE_USERS, SAMPLE_APPOINTMENTS };
