import { useEffect, useState } from "react";

function MatchUsers({ contract }) {
  const [users, setUsers] = useState([]);
  const [user1, setUser1] = useState("");
  const [user2, setUser2] = useState("");

  async function fetchUsers() {
    try {
      const res = await contract.getAllUsers();
      setUsers(res);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMatch(e) {
    e.preventDefault();
    if (!user1 || !user2) return alert("Select two users!");
    try {
      const tx = await contract.matchUsers(user1, user2);
      await tx.wait();
      alert("🎉 Users matched successfully!");
      setUser1("");
      setUser2("");
    } catch (err) {
      console.error(err);
      alert("❌ Error matching users");
    }
  }

  useEffect(() => {
    if (contract) fetchUsers();
  }, [contract]);

  return (
    <div className="match-section">
      <h2>🤝 Match Users</h2>
      <form onSubmit={handleMatch} className="match-form">
        <select value={user1} onChange={(e) => setUser1(e.target.value)}>
          <option value="">Select User 1</option>
          {users.map((u, i) => (
            <option key={i} value={u.id}>{u.name}</option>
          ))}
        </select>

        <select value={user2} onChange={(e) => setUser2(e.target.value)}>
          <option value="">Select User 2</option>
          {users.map((u, i) => (
            <option key={i} value={u.id}>{u.name}</option>
          ))}
        </select>

        <button type="submit">Create Match</button>
      </form>
    </div>
  );
}

export default MatchUsers;
