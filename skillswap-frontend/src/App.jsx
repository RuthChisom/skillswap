import { useState, useEffect } from "react";
import { ethers } from "ethers";
import SkillSwap from "./abi/SkillSwap.json";
import "./App.css"; // Add this for styling

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [name, setName] = useState("");
  const [teach, setTeach] = useState("");
  const [learn, setLearn] = useState("");
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

  // Load users from blockchain
  const loadUsers = async () => {
    if (contract) {
      const allUsers = await contract.getAllUsers();
      setUsers(allUsers);
      const isRegistered = await contract.registered(account);
      setRegistered(isRegistered);
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
    alert("Registration successful!");
    loadUsers();
  };

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
              <h2>🤝 Match Users</h2>
              {/* You’ll add the dropdown + button here next */}
            </div>
          )}


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
              🤝 Get A match
            </button>
          </nav>
        </>
        
      )}

    </div>
  );
}

export default App;
