/** Local layout-editing guard. This is a browser UI lock, not server authentication. */
const editingPasswordDigest = '0cf395f13a80ea7a6800de663c8243385477f0470a387171c0b4d0ef2bd07aea';
export async function matchesEditingPassword(password:string):Promise<boolean>{
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(password));
 return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('')===editingPasswordDigest;
}
