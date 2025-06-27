import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  addDoc,
  collection,
  updateDoc,
  getDoc,
  DocumentData,
  DocumentReference,
  deleteField,
} from "firebase/firestore";
import {
  getAuth,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  updateEmail,
  AuthCredential,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signInAnonymously,
} from "firebase/auth";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { UserData } from "./src/features/user";
import { RoleData, ServerData } from "./src/features/servers";

// import { getAnalytics } from "firebase/analytics";

// Make sure these environment variables are set in your .env file or deployment platform
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD_hz1uDLweZyF2vdH5_XIjH5AE3MheO80",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "hhhmhvn.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "hhhmhvn",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "hhhmhvn.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "699200122926",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "699200122926:web:920be98a6cd547999f6fbf",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-XBWRH9KKG7",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore();
const auth = getAuth();
const user = auth.currentUser;
export type User = typeof user;
// export const analytics = getAnalytics(app);

// -- Utilities --

export async function joinServer(serverID: string) {
  if (!auth.currentUser) return;

  const user = auth.currentUser.uid;

  const docRef = doc(db, "servers", serverID);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists())
    throw new Error("Please enter a valid link or invite code.");

  await setDoc(doc(db, "servers", serverID, "members", user), {});

  await setDoc(doc(db, "users", user, "servers", serverID), {});
}

// -- User Functions --

export async function createAccount(
  email: string,
  password: string,
  username: string
) {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    await updateProfile(user, {
      displayName: username,
      photoURL:
        "https://firebasestorage.googleapis.com/v0/b/banter-69832.appspot.com/o/assets%2FdefaultAvatar.svg?alt=media&token=2cd07b3e-6ee1-4682-8246-57bb20bc0d1f",
    });

    await setDoc(doc(db, "users", user.uid), {
      username: user.displayName,
      avatar: user.photoURL,
      tag: "0000", // TODO: create function to generate unique tag per username
      about: "",
      banner: "#7CC6FE",
      email: user.email,
      theme: "dark",
    });

    await joinServer("ke6NqegIvJEOa9cLzUEp"); // User joins global chat
  } catch (error) {
    console.error(error);
  }
}

export async function updateUserDatabase(property: string, newValue: string) {
  if (!auth.currentUser) return;
  const user = auth.currentUser;
  await updateDoc(doc(db, "users", user.uid), {
    [property]: newValue,
  });
}

export async function saveUserProfileChanges(
  newUser: UserData,
  oldUser: UserData
) {
  if (!auth.currentUser) return;
  const user = auth.currentUser;
  if (oldUser.avatar !== newUser.avatar) {
    await updateProfile(user, { photoURL: newUser.avatar });
    await updateUserDatabase("avatar", newUser.avatar);
  }
  if (oldUser.banner !== newUser.banner) {
    await updateUserDatabase("banner", newUser.banner);
  }
  if (oldUser.about !== newUser.about) {
    await updateUserDatabase("about", newUser.about);
  }
}

export async function signIn(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error(error);
  }
}

export async function signInAsGuest() {
  try {
    const guestCredential = await signInAnonymously(auth);
    const guest = guestCredential.user;

    await updateProfile(guest, {
      displayName: "Guest",
      photoURL:
        "https://firebasestorage.googleapis.com/v0/b/banter-69832.appspot.com/o/assets%2FdefaultAvatar.svg?alt=media&token=2cd07b3e-6ee1-4682-8246-57bb20bc0d1f",
    });

    await setDoc(doc(db, "users", guest.uid), {
      username: guest.displayName,
      avatar: guest.photoURL,
      tag: "0000",
      about: "",
      banner: "#7CC6FE",
      email: guest.email,
      theme: "dark",
    });

    await joinServer("ke6NqegIvJEOa9cLzUEp");
  } catch (error) {
    console.error(error);
  }
}

async function reauthenticateUser(password: string) {
  if (!auth.currentUser || !auth.currentUser.email) return;
  const credential: AuthCredential = EmailAuthProvider.credential(
    auth.currentUser.email,
    password
  );
  await reauthenticateWithCredential(auth.currentUser, credential);
}

export async function logOut() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
  }
}

export async function changeUsername(newUsername: string, password: string) {
  if (!auth.currentUser || !auth.currentUser.email) return;
  const user = auth.currentUser;
  try {
    if (!user.displayName) return;
    await reauthenticateUser(password);
    await updateProfile(user, { displayName: newUsername });
    await updateUserDatabase("username", user.displayName);
  } catch (error) {
    console.error(error);
  }
}

export async function changeEmail(newEmail: string, password: string) {
  if (!auth.currentUser || !auth.currentUser.email) return;
  const user = auth.currentUser;
  try {
    if (!user.email) return;
    await reauthenticateUser(password);
    await updateEmail(user, newEmail);
    await updateUserDatabase("email", user.email);
  } catch (error) {
    console.error(error);
  }
}

// -- Uploads & Avatars --

export async function uploadAvatarPreview(file: File, userID: string) {
  const storage = getStorage();
  const avatarRef = ref(storage, `users/${userID}/temp/avatar`);
  await uploadBytes(avatarRef, file);
  return await getAvatarPreviewURL(userID);
}

async function getAvatarPreviewURL(userID: string) {
  const storage = getStorage();
  return await getDownloadURL(ref(storage, `users/${userID}/temp/avatar`));
}

export async function uploadAvatar(file: File, userID: string) {
  const storage = getStorage();
  const avatarRef = ref(storage, `users/${userID}/avatar`);
  await uploadBytes(avatarRef, file);
  return await getAvatarURL(userID);
}

async function getAvatarURL(userID: string) {
  const storage = getStorage();
  return await getDownloadURL(ref(storage, `users/${userID}/avatar`));
}

// -- Messages --

export async function createMessage(
  serverID: string,
  channelID: string,
  userID: string,
  content: string,
  image?: File
) {
  if (!Date.now) {
    Date.now = function () {
      return new Date().getTime();
    };
  }

  try {
    const docRef = await addDoc(
      collection(db, "servers", serverID, "channels", channelID, "messages"),
      {
        content: content,
        date: Date(),
        edited: false,
        reactions: [],
        timestamp: Date.now(),
        userID: userID,
      }
    );

    if (!image) return;

    uploadMessageImage(image, serverID, channelID, docRef.id);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}

export async function uploadMessageImagePreview(file: File, userID: string) {
  const storage = getStorage();
  const messageImageRef = ref(storage, `users/${userID}/temp/messageImage`);
  await uploadBytes(messageImageRef, file);
  return await getMessageImagePreviewURL(userID);
}

async function getMessageImagePreviewURL(userID: string) {
  const storage = getStorage();
  return await getDownloadURL(
    ref(storage, `users/${userID}/temp/messageImage`)
  );
}

export async function uploadMessageImage(
  file: File,
  serverID: string,
  channelID: string,
  messageID: string
) {
  const storage = getStorage();
  const messageImageRef = ref(
    storage,
    `servers/${serverID}/messages/${messageID}/${file.name}`
  );
  await uploadBytes(messageImageRef, file);
  const messageImageURL = await getDownloadURL(ref(messageImageRef));
  await updateMessageDatabase(
    serverID,
    channelID,
    messageID,
    "image",
    messageImageURL
  );
  return messageImageURL;
}

async function updateMessageDatabase(
  serverID: string,
  channelID: string,
  messageID: string,
  property: string,
  newValue: string
) {
  await updateDoc(
    doc(db, "servers", serverID, "channels", channelID, "messages", messageID),
    {
      [property]: newValue,
    }
  );
}

export async function createGifMessage(
  serverID: string,
  channelID: string,
  userID: string,
  url: string
) {
  if (!Date.now) {
    Date.now = function () {
      return new Date().getTime();
    };
  }

  try {
    await addDoc(
      collection(db, "servers", serverID, "channels", channelID, "messages"),
      {
        video: url,
        date: Date(),
        edited: false,
        reactions: [],
        timestamp: Date.now(),
        userID: userID,
      }
    );
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}

// -- Servers and Roles --

export async function createServer(
  serverName: string,
  userID: string,
  serverImage?: File
) {
  const serverDocRef = await addDoc(collection(db, "servers"), {
    name: serverName,
    img: "",
    defaultChannel: "",
    isPublic: false,
    contentFilter: "off",
  });

  const serverID = serverDocRef.id;

  if (serverImage) await uploadServerImage(serverImage, serverID);

  const defaultChannelRef = await createChannel(
    serverDocRef.id,
    "general",
    "text"
  );

  await updateDefaultChannel(serverDocRef, defaultChannelRef);

  await joinServer(serverDocRef.id);

  await setServerOwner(serverID, userID);

  return serverDocRef.id;
}

export async function createChannel(
  serverID: string,
  channelName: string,
  type: string
) {
  const channelDocRef = await addDoc(
    collection(db, "servers", serverID, "channels"),
    {
      name: channelName,
      type: type,
    }
  );
  return channelDocRef;
}

export async function updateDefaultChannel(
  server: DocumentReference<DocumentData>,
  channel: DocumentReference<DocumentData>
) {
  await updateDoc(server, {
    defaultChannel: channel.id,
  });
}

async function setServerOwner(serverID: string, userID: string) {
  await updateDoc(doc(db, "servers", serverID, "members", userID), {
    serverOwner: true,
  });
}

export async function saveServerChanges(
  newServer: ServerData,
  oldServer: ServerData
) {
  if (newServer.img !== oldServer.img) {
    await updateServerDatabase(newServer.serverID, "img", newServer.img);
  }
  if (newServer.name !== oldServer.name) {
    await updateServerDatabase(newServer.serverID, "name", newServer.name);
  }
  if (newServer.roles !== oldServer.roles) {
    await updateServerDatabase(newServer.serverID, "roles", newServer.roles);
  }
  if (newServer.contentFilter !== oldServer.contentFilter) {
    await updateServerDatabase(
      newServer.serverID,
      "contentFilter",
      newServer.contentFilter
    );
  }
}

export async function uploadServerImagePreview(file: File, userID: string) {
  const storage = getStorage();
  const serverImageRef = ref(storage, `users/${userID}/temp/serverImage`);
  await uploadBytes(serverImageRef, file);
  return await getServerImagePreviewURL(userID);
}

async function getServerImagePreviewURL(userID: string) {
  const storage = getStorage();
  return await getDownloadURL(ref(storage, `users/${userID}/temp/serverImage`));
}

export async function uploadServerImage(file: File, serverID: string) {
  const storage = getStorage();
  const serverImageRef = ref(storage, `servers/${serverID}/serverImage`);
  await uploadBytes(serverImageRef, file);
  const serverImageURL = await getServerImageURL(serverID);
  await updateServerDatabase(serverID, "img", serverImageURL);
  return serverImageURL;
}

async function getServerImageURL(serverID: string) {
  const storage = getStorage();
  return await getDownloadURL(ref(storage, `servers/${serverID}/serverImage`));
}

export async function createServerRole(server: ServerData, newRoleID: string) {
  await updateDoc(doc(db, "servers", server.serverID), {
    roles: server.roles
      ? [
          ...server.roles,
          {
            name: "new role",
            color: "rgb(153,170,181)",
            separateDisplay: false,
            sort: server.roles.length,
            permissions: {
              manageChannels: false,
              manageRoles: false,
              manageServer: false,
            },
            roleID: newRoleID,
          },
        ]
      : [
          {
            name: "new role",
            color: "rgb(153,170,181)",
            separateDisplay: false,
            sort: 0,
            permissions: {
              manageChannels: false,
              manageRoles: false,
              manageServer: false,
            },
            roleID: newRoleID,
          },
        ],
  });
}

export async function setServerRole(
  serverID: string,
  userID: string,
  newRoles: string[]
) {
  if (newRoles.length > 0) {
    await updateDoc(doc(db, "servers", serverID, "members", userID), {
      roles: newRoles,
    });
  } else {
    await updateDoc(doc(db, "servers", serverID, "members", userID), {
      roles: deleteField(),
    });
  }
}

async function updateServerDatabase(
  serverID: string,
  property: string,
  newValue: string | RoleData[]
) {
  await updateDoc(doc(db, "servers", serverID), {
    [property]: newValue,
  });
}
