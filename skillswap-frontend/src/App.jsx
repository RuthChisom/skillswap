import { useState, useEffect } from "react";
import { ethers } from "ethers";
import SkillSwap from "./abi/SkillSwap.json";
import "./App.css";
import { FaTwitter, FaEnvelope } from "react-icons/fa";
import { SiFarcaster } from "react-icons/si";


const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [name, setName] = useState("");
  const [teach, setTeach] = useState("");
  const [learn, setLearn] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [registered, setRegistered] = useState(false);
  const [page, setPage] = useState("home");



  // Connect wallet and load contract
  const connectWallet = async () => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const skillSwap = new ethers.Contract(contractAddress, SkillSwap.abi, signer);
      setAccount(accounts[0]);
      setContract(skillSwap);
    } else {
      alert("Please install MetaMask to use this app!");
    }
  };

  // Load users from blockchain and set current user details
  const loadUsers = async () => {
  if (contract && account) {
    const allUsers = await contract.getAllUsers();
    setUsers(allUsers);

    const isRegistered = await contract.registered(account);
    setRegistered(isRegistered);

    if (isRegistered) {
      // Find the logged-in user's data from allUsers
      const current = allUsers.find(
        (u) => u.wallet.toLowerCase() === account.toLowerCase()
      );

      if (current) {
        setCurrentUser({
          name: current.name,
          skillToTeach: current.skillToTeach,
          skillToLearn: current.skillToLearn,
          wallet: current.wallet,
          email: current.email || ""
        });
      }
    }
  }
};


  useEffect(() => {
    if (contract && account) {
      loadUsers();
    }
  }, [contract, account]);

  // Register new user
  const registerUser = async (e) => {
    e.preventDefault();
    const tx = await contract.registerUser(name, teach, learn);
    await tx.wait();
    setCurrentUser({ name, skillToTeach, skillToLearn, wallet: address });
    alert("Registration successful!");
    await loadUsers();
  };

  const findMatches = () => {
    if (!currentUser || users.length === 0) return [];

    return users.filter(
      (u) =>
        u.wallet.toLowerCase() !== currentUser.wallet.toLowerCase() && // not yourself
        u.skillToTeach.toLowerCase() === currentUser.skillToLearn.toLowerCase() &&
        u.skillToLearn.toLowerCase() === currentUser.skillToTeach.toLowerCase()
    );
  };

  const matchedUsers = findMatches();

  return (
    <div className="app-container">
      <h1 className="title">⚡ SkillSwap</h1>
      <p className="subtitle">Find and exchange skills directly onchain</p>
      {!account ? (
          <button onClick={connectWallet} className="btn-primary">
            Connect Wallet
          </button>
        ) : (
        <>
          <p className="account">Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
          {page === "home" && (
            <>
            {!registered && (
              <form className="form-card" onSubmit={registerUser}>
                <input
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <input
                  placeholder="Skill you can teach"
                  value={teach}
                  onChange={(e) => setTeach(e.target.value)}
                  required
                />
                <input
                  placeholder="Skill you want to learn"
                  value={learn}
                  onChange={(e) => setLearn(e.target.value)}
                  required
                />
                <button type="submit" className="btn-primary">
                  Register
                </button>
              </form>
            )}
            <h2 className="section-title">👥 Registered Users</h2>
            <table className="user-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Skills</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map((u, i) => (
                      <tr key={i}>
                        <td className="skill-cell">{u.name}</td>
                        <td>
                          <div className="skill-cell">
                            <p>🎓 <strong>Teaches:</strong> {u.skillToTeach}</p>
                            <p>📘 <strong>Learning:</strong> {u.skillToLearn}</p>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2">No users yet</td>
                    </tr>
                  )}
                </tbody>
            </table>
            </>
          )}

          {page === "match" && (
            <div className="match-section">
              {/* Match Section */}
              <div className="match-section">
                <h2>🔗 Skill Matches</h2>
                {matchedUsers.length > 0 ? (
                  <>
                    <p className="match-intro">
                      Here’s a list of amazing people interested in teaching you
                      <strong> {currentUser.skillToLearn}</strong> while learning
                      <strong> {currentUser.skillToTeach}</strong> from you.  
                      Feel free to connect and begin your learning journey at no cost ✨
                    </p>

                    <div className="match-list">
                      {matchedUsers.map((m, i) => (
                        <div key={i} className="match-item">
                          <span className="match-name">{m.name}</span>
                          <div className="connect-icons">
                            {/* {m.email && ( */}
                              <a 
                                href={`mailto:${m.email}`} 
                                className="icon-link"
                                title="Email"
                              >
                                <FaEnvelope />
                              </a>
                            {/* )} */}
                            {/* {m.twitter && ( */}
                              <a
                                href={`https://twitter.com/${m.twitter}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="icon-link"
                                title="Twitter"
                              >
                                <FaTwitter />
                              </a>
                            {/* )} */}
                            {/* {m.farcaster && ( */}
                              <a
                                href={`https://warpcast.com/${m.farcaster}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="icon-link"
                                title="Farcaster"
                              >
                                <SiFarcaster />
                              </a>
                            {/* )} */}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="no-match">
                    😔 We couldn’t find anyone for you yet. Check back soon — your ideal learning partner might be registering right now!
                  </p>
                )}
              </div>


            </div>
          )}

          {registered && (
            <nav className="nav">
              <button
                className={page === "home" ? "active" : ""}
                onClick={() => setPage("home")}
              >
                🏠 Home
              </button>
              <button
                className={page === "match" ? "active" : ""}
                onClick={() => setPage("match")}
              >
                🤝 Get A Match
              </button>
            </nav>
          )}

        </>
        
      )}

    </div>
  );
}

export default App;
