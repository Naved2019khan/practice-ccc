import mongoose from 'mongoose';
import dns from 'dns';

// Windows workaround: Node's c-ares resolver here fails to read the system DNS
// servers and falls back to loopback/IPv6 defaults (127.0.0.1, fec0:0:0:ffff::1).
// Nothing answers on those, so mongodb+srv:// SRV lookups fail with
// "querySrv ECONNREFUSED". The MongoDB driver resolves via dns.promises, which
// keeps its OWN default resolver — dns.setServers() does not reconfigure it once
// dns.promises has been touched, so both must be set explicitly. Point them at
// reliable public DNS. (If your network blocks public DNS, replace these with
// your own resolver, e.g. the one shown by `nslookup`.)
const PUBLIC_DNS = ['1.1.1.1', '8.8.8.8'];
const usable = (servers: string[]) =>
  servers.some((s) => /^\d+\.\d+\.\d+\.\d+$/.test(s) && !s.startsWith('127.'));

if (!usable(dns.getServers())) {
  console.log('[db] Overriding unusable DNS servers', dns.getServers(), '->', PUBLIC_DNS.join(', '));
  dns.setServers(PUBLIC_DNS);
}
if (!usable(dns.promises.getServers())) {
  console.log(
    '[db] Overriding unusable dns.promises servers',
    dns.promises.getServers(),
    '->',
    PUBLIC_DNS.join(', ')
  );
  dns.promises.setServers(PUBLIC_DNS);
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/flight-crm';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log(' Connected to MongoDB:', MONGODB_URI);
      return mongooseInstance;
    }).catch((err) => {
      console.error(' MongoDB connection error:', err.message);
      cached!.promise = null;
      throw err;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

export default connectToDatabase;
