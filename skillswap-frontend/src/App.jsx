import { useEffect, useState } from "react";
import { ethers } from "ethers";
import SkillSwap from "./abi/SkillSwap.json";
import "./App.css";
import toast, { Toaster } from "react-hot-toast";
import { FaTwitter, FaEnvelope } from "react-icons/fa";
import { SiFarcaster } from "react-icons/si";

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || "";

const PROFILE_CACHE_KEY = "skillswap_profiles_v1";

/**
 * Helpers
 */
const isValidEmail = (s) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());

const isValidHandle = (h) => {
  if (!h) return false;
  const s = h.trim();
  // allow "@handle" or "handle", only letters numbers _ and -
  // const normalized = s.startsWith("@") ? s.slice(1) : s;
  // return /^[A-Za-z0-9_~-]{1,15}$/.test(normalized);
  return s;
};

const handleToLink = (platform, handle) => {
  if (!handle) return null;
  const normalized = handle.startsWith("@") ? handle.slice(1) : handle;
  if (platform === "twitter") 
    // return `https://twitter.com/${normalized}`;
    return `${normalized}`;
  if (platform === "farcaster") 
    // return `https://warpcast.com/${normalized}`;
    return `${normalized}`;
  return null;
};

const loadProfileCache = () => {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveProfileCache = (wallet, data) => {
  try {
    const cache = loadProfileCache();
    cache[wallet.toLowerCase()] = data;
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
  } catch {}
};

const getCachedProfile = (wallet) => {
  const cache = loadProfileCache();
  return cache[wallet?.toLowerCase()] || null;
};

function decodeSkill(skill) {
  try { 
    return ethers.decodeBytes32String(skill) 
  } 
  catch { 
    return skill // fallback if already plain text
  }
}

/**
 * App component
 */
function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);

  // registration form
  const [name, setName] = useState("");
  const [teach, setTeach] = useState("");
  const [learn, setLearn] = useState("");
  const [twitter, setTwitter] = useState("");
  const [farcaster, setFarcaster] = useState("");
  const [email, setEmail] = useState("");

  // profile fields (editable)
  const [bio, setBio] = useState("");

  const [registered, setRegistered] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // object from contract plus display fields
  const [users, setUsers] = useState([]); // raw onchain users
  const [displayUsers, setDisplayUsers] = useState([]); // decorated for UI (readable skills when available)
  const [page, setPage] = useState("home");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);

  // -------- connect wallet & contract (ethers v6) ----------
  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error("Please install MetaMask or another injected wallet.");
      return;
    }
    try {
      const prov = new ethers.BrowserProvider(window.ethereum);
      setProvider(prov);
      const accounts = await prov.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) {
        toast.error("No accounts found.");
        return;
      }
      const acct = accounts[0];
      const signer = await prov.getSigner();
      const skillSwap = new ethers.Contract(contractAddress, SkillSwap.abi, signer);
      setAccount(acct);
      setContract(skillSwap);
      toast.success("Wallet connected");
    } catch (err) {
      console.error(err);
      toast.error("Wallet connection failed");
    }
  };

  // -------- load users & current user ----------
  const loadAllUsers = async () => {
    if (!contract) return;
    try {
      const arr = await contract.getAllUsers();
      setUsers(arr);
      // build displayUsers mapping with skill display preference:
      const decorated = arr.map((u) => {
        const wallet = (u.wallet || "").toLowerCase();
        const cached = getCachedProfile(wallet);
        return {
          id: Number(u.id),
          wallet,
          name: u.name,
          skillToTeachHash: u.skillToTeach,
          skillToLearnHash: u.skillToLearn,
          bio: u.bio,
          socials: {
            twitter: u.socials?.twitter || "",
            farcaster: u.socials?.farcaster || "",
            email: u.socials?.email || "",
          },
          // readable skills if we have them cached from this frontend
          // teachReadable: cached?.teach || null,
          teachReadable: decodeSkill(cached?.teach || null),
          learnReadable: decodeSkill(cached?.learn || null),
        };
      });
      setDisplayUsers(decorated);
    } catch (err) {
      console.error("loadAllUsers error", err);
    }
  };

  const loadCurrentUser = async (acct) => {
    if (!contract || !acct) return;
    try {
      // safe check using myUserId (doesn't revert)
      const id = await contract.myUserId();
      const myId = Number(id);
      if (!myId || myId === 0) {
        setRegistered(false);
        setCurrentUser(null);
        return;
      }
      const u = await contract.getUserById(myId);
      const wallet = (u.wallet || "").toLowerCase();
      const cached = getCachedProfile(wallet);
      const decorated = {
        id: Number(u.id),
        wallet,
        name: u.name,
        skillToTeachHash: u.skillToTeach,
        skillToLearnHash: u.skillToLearn,
        bio: u.bio,
        socials: {
          twitter: u.socials?.twitter || "",
          farcaster: u.socials?.farcaster || "",
          email: u.socials?.email || "",
        },
        teachReadable: cached?.teach || "",
        learnReadable: cached?.learn || "",
      };
      setCurrentUser(decorated);
      setRegistered(true);

      // preload editable fields from cache or onchain (onchain has hashes only)
      setName(decorated.name || "");
      setBio(decorated.bio || "");
      setTwitter(decorated.socials.twitter || "");
      setFarcaster(decorated.socials.farcaster || "");
      setEmail(decorated.socials.email || "");
      // if we have readable skills cached, use them in input placeholders
      setTeach(decorated.teachReadable || "");
      setLearn(decorated.learnReadable || "");
    } catch (err) {
      // getUserByWallet reverts if not registered, but we used myUserId path
      console.error("loadCurrentUser error", err);
      setRegistered(false);
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    if (contract && account) {
      loadAllUsers();
      loadCurrentUser(account);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, account]);

  // ---------- event listeners ----------
  useEffect(() => {
    if (!contract) return;

    const onRegistered = (userId, wallet, name, skillToTeach, skillToLearn, timestamp) => {
      const w = (wallet || "").toLowerCase();
      toast.success(`User registered: ${name} (${w.slice(0,6)}...${w.slice(-4)})`);
      // refresh lists
      loadAllUsers();
      // if the new registration is us, reload our profile
      if (account && account.toLowerCase() === w) {
        loadCurrentUser(account);
      }
    };

    const onUpdated = (userId, wallet, newTeach, newLearn, timestamp) => {
      const w = (wallet || "").toLowerCase();
      toast.success(`Profile updated (${w.slice(0,6)}...${w.slice(-4)})`);
      loadAllUsers();
      if (account && account.toLowerCase() === w) loadCurrentUser(account);
    };

    const onMatched = (userId, matchedIds, wallet, timestamp) => {
      const w = (wallet || "").toLowerCase();
      toast(`Matches recorded for ${w.slice(0,6)}...${w.slice(-4)}`, { icon: "🔗" });
      // optionally refresh matches if it's us
      if (account && account.toLowerCase() === w) {
        handleFetchMatches(); // refresh
      }
    };

    try {
      contract.on("UserRegistered", onRegistered);
      contract.on("UserUpdated", onUpdated);
      contract.on("UsersMatched", onMatched);
    } catch (e) {
      console.warn("Event hookup failed", e);
    }

    return () => {
      try {
        contract.off("UserRegistered", onRegistered);
        contract.off("UserUpdated", onUpdated);
        contract.off("UsersMatched", onMatched);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, account]);

  // ---------- validation ----------
  const validateRegistration = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return false;
    }
    if (!teach.trim() || !learn.trim()) {
      toast.error("Both skills are required");
      return false;
    }
    if (teach.trim().toLowerCase() === learn.trim().toLowerCase()) {
      toast.error("Skill to teach must differ from skill to learn");
      return false;
    }
    if (!twitter && !farcaster && !email) {
      toast.error("At least one contact method is required (Twitter, Farcaster, or Email)");
      return false;
    }
    if (email && !isValidEmail(email)) {
      toast.error("Email format invalid");
      return false;
    }
    // if (twitter && !isValidHandle(twitter)) {
    //   toast.error("Twitter handle invalid (use @handle or handle with letters/numbers/_/-)");
    //   return false;
    // }
    // if (farcaster && !isValidHandle(farcaster)) {
    //   toast.error("Farcaster handle invalid (use @handle or handle with letters/numbers/_/-)");
    //   return false;
    // }
    return true;
  };

  // ---------- register ----------
  const handleRegister = async (e) => {
    e?.preventDefault?.();
    if (!contract || !account) {
      toast.error("Connect your wallet first");
      return;
    }
    if (!validateRegistration()) return;

    try {
      setLoading(true);
      const tx = await contract.register(
        name.trim(),
        teach.trim(),
        learn.trim(),
        twitter.trim(),
        farcaster.trim(),
        email.trim()
      );
      toast.promise(tx.wait(), {
        loading: "Registering onchain...",
        success: "Registeration Successful 🎉",
        error: "Registration failed",
      });
      await tx.wait();
      
      // ✅ Mark as registered (hide form)
      setRegistered(true);

      // cache readable skills for display
      saveProfileCache(account, { teach: teach.trim(), learn: learn.trim() });

      // refresh
      await loadAllUsers();
      await loadCurrentUser(account);

    } catch (err) {
      console.error("register error", err);
      const msg = err?.reason || err?.message || "Registration failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ---------- update profile ----------
  const validateProfileUpdate = () => {
    // if user supplies new skills, ensure they are not equal
    const newTeach = teach?.trim();
    const newLearn = learn?.trim();
    if (newTeach && newLearn && newTeach.toLowerCase() === newLearn.toLowerCase()) {
      toast.error("Skill to teach must differ from skill to learn");
      return false;
    }
    if (email && !isValidEmail(email)) {
      toast.error("Email format invalid");
      return false;
    }
    if (twitter && !isValidHandle(twitter)) {
      toast.error("Twitter handle invalid");
      return false;
    }
    if (farcaster && !isValidHandle(farcaster)) {
      toast.error("Farcaster handle invalid");
      return false;
    }
    // ensure user does not clear all socials on frontend
    const resultingTwitter = twitter || currentUser?.socials?.twitter || "";
    const resultingFarcaster = farcaster || currentUser?.socials?.farcaster || "";
    const resultingEmail = email || currentUser?.socials?.email || "";
    if (!resultingTwitter && !resultingFarcaster && !resultingEmail) {
      toast.error("You must keep at least one contact method (twitter, farcaster, or email).");
      return false;
    }
    return true;
  };

  const handleUpdateProfile = async (e) => {
    e?.preventDefault?.();
    if (!contract || !currentUser) {
      toast.error("You must be registered and connected");
      return;
    }
    if (!validateProfileUpdate()) return;

    try {
      setLoading(true);
      // Pass empty string for fields we want unchanged (contract accepts empty -> keep)
      const skillTeachArg = teach?.trim() || "";
      const skillLearnArg = learn?.trim() || "";
      const bioArg = bio != null ? bio : "";
      const twitterArg = twitter != null ? twitter.trim() : "";
      const farcasterArg = farcaster != null ? farcaster.trim() : "";
      const emailArg = email != null ? email.trim() : "";

      const tx = await contract.updateProfile(
        currentUser.id,
        skillTeachArg,
        skillLearnArg,
        bioArg,
        twitterArg,
        farcasterArg,
        emailArg
      );

      toast.promise(tx.wait(), {
        loading: "Updating profile onchain...",
        success: "Profile updated ✅",
        error: "Profile update failed",
      });

      await tx.wait();

      // update cache of readable skills if provided
      const wallet = account.toLowerCase();
      const cached = getCachedProfile(wallet) || {};
      if (skillTeachArg) cached.teach = skillTeachArg;
      if (skillLearnArg) cached.learn = skillLearnArg;
      saveProfileCache(wallet, cached);

      await loadAllUsers();
      await loadCurrentUser(account);
    } catch (err) {
      console.error("updateProfile error", err);
      toast.error(err?.reason || err?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  // ---------- matching ----------
  const handleTriggerFindMatches = async () => {
    if (!contract || !currentUser) {
      toast.error("You must be registered to find matches");
      return;
    }
    try {
      setLoading(true);
      const tx = await contract.findMatches(currentUser.id);
      toast.promise(tx.wait(), {
        loading: "Finding matches onchain...",
        success: "Matches computed ✅",
        error: "Finding matches failed",
      });
      await tx.wait();
      // after findMatches runs, the contract emits UsersMatched; but we'll fetch getUserMatches explicitly
      await handleFetchMatches();
    } catch (err) {
      console.error("findMatches error", err);
      toast.error("Find matches failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchMatches = async () => {
    if (!contract || !currentUser) return;
    try {
      setLoading(true);
      const matchedIds = await contract.getUserMatches(currentUser.id);
      const arr = [];
      for (const id of matchedIds) {
        const u = await contract.getUserById(id);
        const wallet = (u.wallet || "").toLowerCase();
        const cached = getCachedProfile(wallet);
        arr.push({
          id: Number(u.id),
          name: u.name,
          wallet,
          bio: u.bio,
          socials: {
            twitter: u.socials?.twitter || "",
            farcaster: u.socials?.farcaster || "",
            email: u.socials?.email || "",
          },
          teachReadable: cached?.teach || null,
          learnReadable: cached?.learn || null,
          skillToTeachHash: u.skillToTeach,
          skillToLearnHash: u.skillToLearn,
        });
      }
      setMatches(arr);
    } catch (err) {
      console.error("fetchMatches error", err);
      toast.error("Failed to fetch matches");
    } finally {
      setLoading(false);
    }
  };

  // ---------- small UI helpers ----------
  const readableSkill = (u) =>
    u.teachReadable && u.learnReadable
      ? { teach: u.teachReadable, learn: u.learnReadable }
      : null;

  // ---------- render ----------
  return (
    <div className="app-container">
      <Toaster position="top-right" />
      <h1 className="title">⚡ SkillSwap</h1>
      <p className="subtitle">Find and exchange skills directly onchain</p>

      {!account ? (
        <div className="center-stack">
          <button className="btn-primary" onClick={connectWallet}>
            Connect Wallet
          </button>
          {/* <p className="hint">Make sure your wallet is set to the network where the contract is deployed.</p> */}
        </div>
      ) : (
        <>
          <p className="account">
            Connected: {account.slice(0, 6)}...{account.slice(-4)}
          </p>

          <nav className="nav">
            <button className={page === "home" ? "active" : ""} onClick={() => setPage("home")}>🏠 Home</button>
            <button className={page === "match" ? "active" : ""} onClick={() => setPage("match")}>🤝 Match</button>
            <button className={page === "profile" ? "active" : ""} onClick={() => setPage("profile")}>👤 Profile</button>
          </nav>

          {page === "home" && (
            <>
              {!registered ? (
                <form className="form-card" onSubmit={handleRegister}>
                  <input placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} />
                  <input placeholder="Skill you can teach" value={teach} onChange={(e) => setTeach(e.target.value)} />
                  <input placeholder="Skill you want to learn" value={learn} onChange={(e) => setLearn(e.target.value)} />
                  {/* <input placeholder="Twitter (e.g. @you)" value={twitter} onChange={(e) => setTwitter(e.target.value)} /> */}
                  {/* <input placeholder="Farcaster (e.g. @you)" value={farcaster} onChange={(e) => setFarcaster(e.target.value)} /> */}
                  <input
                    type="url"
                    placeholder="Twitter URL (e.g. https://twitter.com/yourhandle)"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    pattern="https?://(www\.)?(twitter\.com|x\.com)/[A-Za-z0-9_]+"
                    title="Please enter a valid Twitter URL"
                  />

                  <input
                    type="url"
                    placeholder="Farcaster URL (e.g. https://warpcast.com/yourhandle)"
                    value={farcaster}
                    onChange={(e) => setFarcaster(e.target.value)}
                    pattern="https?://(www\.)?warpcast\.com/[A-Za-z0-9_]+"
                    title="Please enter a valid Farcaster URL"
                  />

                  <input placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <button className="btn-primary" type="submit" disabled={loading}>
                      {loading ? "Processing..." : "Register"}
                    </button>
                  </div>
                  {/* <p className="small">We store human-readable skills locally to keep the UI friendly. Onchain only stores hashed skills for privacy/proof.</p> */}
                </form>
              ) : (
                <div className="info-card">
                  <h3>You're registered ✅</h3>
                  <p><strong>{currentUser?.name}</strong></p>
                  <p>
                    {currentUser?.teachReadable ? (
                      <>🎓 Teaches: <strong>{currentUser.teachReadable}</strong></>
                    ) : (
                      <>🎓 Teaches: <em>onchain (hash)</em></>
                    )}
                  </p>
                  <p>
                    {currentUser?.learnReadable ? (
                      <>📘 Learning: <strong>{currentUser.learnReadable}</strong></>
                    ) : (
                      <>📘 Learning: <em>onchain (hash)</em></>
                    )}
                  </p>
                  <p className="small">Want to update your profile? Go to the Profile tab.</p>
                </div>
              )}

              <h2 className="section-title">👥 Registered Users</h2>
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Skills</th>
                    <th>Contacts</th>
                  </tr>
                </thead>
                <tbody>
                  {displayUsers.length > 0 ? (
                    displayUsers.map((u) => (
                      <tr key={u.id}>
                        <td className="skill-cell">{u.name}</td>
                        <td>
                          <div className="skill-cell">
                            <p>🎓 <strong>Teaches:</strong> {u.teachReadable || String(u.skillToTeachHash)}</p>
                            <p>📘 <strong>Learning:</strong> {u.learnReadable || String(u.skillToLearnHash)}</p>
                          </div>
                        </td>
                        <td>
                          <div className="connect-icons">
                            {u.socials.email && (
                              <a className="icon-link" title="Email" href={`mailto:${u.socials.email}`}><FaEnvelope /></a>
                            )}
                            {u.socials.twitter && (
                              <a className="icon-link" title="Twitter" href={handleToLink("twitter", u.socials.twitter)} target="_blank" rel="noreferrer"><FaTwitter /></a>
                            )}
                            {u.socials.farcaster && (
                              <a className="icon-link" title="Farcaster" href={handleToLink("farcaster", u.socials.farcaster)} target="_blank" rel="noreferrer"><SiFarcaster /></a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="3">No users yet</td></tr>
                  )}
                </tbody>
              </table>
            </>
          )}

          {page === "match" && (
            <div className="match-section">
              <h2>🔗 Skill Matches</h2>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}>
                <button className="btn-secondary" onClick={handleTriggerFindMatches} disabled={loading}>
                  {loading ? "Searching..." : "Find Matches (onchain)"}
                </button>
                <button className="btn-secondary" onClick={handleFetchMatches} disabled={loading}>
                  Refresh Matches
                </button>
              </div>

              {matches.length > 0 ? (
                <div className="match-list">
                  {matches.map((m) => (
                    <div key={m.id} className="match-item">
                      <div>
                        <div className="match-name">{m.name}</div>
                        <div className="small">{m.teachReadable ? `Teaches: ${m.teachReadable}` : `Teaches (hash): ${String(m.skillToTeachHash)}`}</div>
                        <div className="small">{m.learnReadable ? `Learning: ${m.learnReadable}` : `Learning (hash): ${String(m.skillToLearnHash)}`}</div>
                      </div>
                      <div className="connect-icons">
                        {m.socials.email && <a className="icon-link" title="Email" href={`mailto:${m.socials.email}`}><FaEnvelope /></a>}
                        {m.socials.twitter && <a className="icon-link" title="Twitter" href={handleToLink("twitter", m.socials.twitter)} target="_blank" rel="noreferrer"><FaTwitter /></a>}
                        {m.socials.farcaster && <a className="icon-link" title="Farcaster" href={handleToLink("farcaster", m.socials.farcaster)} target="_blank" rel="noreferrer"><SiFarcaster /></a>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-match">No matches yet — try "Find Matches" to compute them onchain.</p>
              )}
            </div>
          )}

          {page === "profile" && (
            <div className="profile-section">
              <h2>Your Profile</h2>
              {!registered ? (
                <div className="info-card">
                  <p>You are not registered yet. Go to Home and register.</p>
                </div>
              ) : (
                <form className="form-card" onSubmit={handleUpdateProfile}>
                  <label className="label">Name (immutable)</label>
                  <input value={currentUser?.name || ""} disabled />
                  <label className="label">Skill you teach </label>
                  <input placeholder={currentUser?.teachReadable || "Skill (onchain stored hashed)"} value={teach} onChange={(e) => setTeach(e.target.value)} />
                  <label className="label">Skill you want to learn </label>
                  <input placeholder={currentUser?.learnReadable || "Skill (onchain stored hashed)"} value={learn} onChange={(e) => setLearn(e.target.value)} />
                  <label className="label">Bio</label>
                  <input placeholder={currentUser?.bio || "Short bio"} value={bio} onChange={(e) => setBio(e.target.value)} />
                  <label className="label">Twitter</label>
                  <input placeholder={currentUser?.socials?.twitter || "@you"} value={twitter} onChange={(e) => setTwitter(e.target.value)} />
                  <label className="label">Farcaster</label>
                  <input placeholder={currentUser?.socials?.farcaster || "@you"} value={farcaster} onChange={(e) => setFarcaster(e.target.value)} />
                  <label className="label">Email</label>
                  <input placeholder={currentUser?.socials?.email || "you@example.com"} value={email} onChange={(e) => setEmail(e.target.value)} />
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <button className="btn-primary" type="submit" disabled={loading}>{loading ? "Updating..." : "Update Profile"}</button>
                    <button type="button" className="btn-ghost" onClick={() => {
                      // reset local inputs to stored
                      setTeach(currentUser?.teachReadable || "");
                      setLearn(currentUser?.learnReadable || "");
                      setBio(currentUser?.bio || "");
                      setTwitter(currentUser?.socials?.twitter || "");
                      setFarcaster(currentUser?.socials?.farcaster || "");
                      setEmail(currentUser?.socials?.email || "");
                      toast("Inputs reset");
                    }}>Reset</button>
                  </div>
                </form>
              )}
            </div>
          )}
        </>
      )}
      <footer style={{ marginTop: 24, color: "#8b9bb1", fontSize: 13 }}>
        {/* Built with ❤️ — remember that onchain skills are stored as hashes for privacy (we cache readable skills locally). */}
        Built with ❤️ by <a href="https://x.com/techychisom" target="_blank">Techy Chisom</a>
      </footer>
    </div>
  );
}

export default App;