const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return;
  
  try {
    const serviceAccountPath = process.env.FIREBASE_PRIVATE_KEY_PATH || './firebase-service-account.json';
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(path.resolve(serviceAccountPath));
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
      
      firebaseInitialized = true;
      console.log('Firebase initialized successfully');
    } else {
      console.warn('Firebase service account file not found. Firebase features will be disabled.');
      console.warn('Please add your firebase-service-account.json file to enable cloud storage.');
    }
  } catch (error) {
    console.error('Error initializing Firebase:', error.message);
  }
}

initializeFirebase();

const db = firebaseInitialized ? admin.firestore() : null;
const bucket = firebaseInitialized ? admin.storage().bucket() : null;

async function saveStreamMetadata(streamData) {
  if (!db) {
    console.warn('Firebase not initialized. Skipping metadata save.');
    return null;
  }
  
  try {
    const docRef = await db.collection('streams').add({
      ...streamData,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Stream metadata saved:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving stream metadata:', error);
    throw error;
  }
}

async function updateStreamStatus(streamId, status, additionalData = {}) {
  if (!db) {
    console.warn('Firebase not initialized. Skipping status update.');
    return;
  }
  
  try {
    await db.collection('streams').doc(streamId).update({
      status,
      ...additionalData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Stream ${streamId} status updated to ${status}`);
  } catch (error) {
    console.error('Error updating stream status:', error);
    throw error;
  }
}

async function uploadRecording(filePath, streamId) {
  if (!bucket) {
    console.warn('Firebase Storage not initialized. File will remain local.');
    return null;
  }
  
  try {
    const fileName = path.basename(filePath);
    const destination = `recordings/${streamId}/${fileName}`;
    
    await bucket.upload(filePath, {
      destination,
      metadata: {
        contentType: 'video/mp4',
        metadata: {
          streamId,
          uploadedAt: new Date().toISOString()
        }
      }
    });
    
    const file = bucket.file(destination);
    await file.makePublic();
    
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
    console.log('Recording uploaded to Firebase Storage:', publicUrl);
    
    return publicUrl;
  } catch (error) {
    console.error('Error uploading recording:', error);
    throw error;
  }
}

async function getRecordings(limit = 50) {
  if (!db) {
    console.warn('Firebase not initialized. Returning empty recordings list.');
    return [];
  }
  
  try {
    const snapshot = await db.collection('streams')
      .where('status', '==', 'completed')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    const recordings = [];
    snapshot.forEach(doc => {
      recordings.push({ id: doc.id, ...doc.data() });
    });
    
    return recordings;
  } catch (error) {
    console.error('Error fetching recordings:', error);
    throw error;
  }
}

async function getStreamData(streamId) {
  if (!db) {
    console.warn('Firebase not initialized. Cannot fetch stream data.');
    return null;
  }
  
  try {
    const doc = await db.collection('streams').doc(streamId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error fetching stream data:', error);
    throw error;
  }
}

async function incrementViewCount(streamId) {
  if (!db) return;
  
  try {
    await db.collection('streams').doc(streamId).update({
      viewCount: admin.firestore.FieldValue.increment(1)
    });
  } catch (error) {
    console.error('Error incrementing view count:', error);
  }
}

module.exports = {
  saveStreamMetadata,
  updateStreamStatus,
  uploadRecording,
  getRecordings,
  getStreamData,
  incrementViewCount,
  isInitialized: () => firebaseInitialized
};
