import { useState, useEffect } from "react";
import { ethers } from "ethers";
import abiFile from "./abi/SkillSwap.json";
import ConnectWallet from "./components/ConnectWallet";
import RegisterForm from "./components/RegisterForm";
import UserList from "./components/UserList";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);

  async function connectWallet() {
    if (!window.ethereum) {
      alert("MetaMask not detected!");
      return;
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const accounts = await provider.listAccounts();
    const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, abiFile.abi, signer);
    setAccount(accounts[0].address || accounts[0]);
    setContract(contractInstance);
  }

  // Check registration status
  async function checkRegistration() {
    if (!contract || !account) return;
    try {
      const registered = await contract.registered(account);
      setIsRegistered(registered);
    } catch (err) {
      console.error("Error checking registration:", err);
    }
  }

  useEffect(() => {
    checkRegistration();
  }, [contract, account]);

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>SkillSwap</h1>
      {!account ? (
        <ConnectWallet connect={connectWallet} />
      ) : (
        <>
          <p>Connected as {account}</p>

          {!isRegistered ? (
            <RegisterForm contract={contract} onRegistered={() => setIsRegistered(true)} />
          ) : (
            <p style={{ color: "green" }}>✅ You’re already registered!</p>
          )}

          <UserList contract={contract} account={account} />
        </>
      )}
    </div>
  );
}

export default App;
