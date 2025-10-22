import { useState, useEffect } from "react";

function UserList({ contract, account }) {
  const [users, setUsers] = useState([]);

  async function loadUsers() {
    try {
      const allUsers = await contract.getAllUsers();
      setUsers(allUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }

  async function matchWith(userId) {
    try {
      // Find the current user’s own ID
      const all = await contract.getAllUsers();
      const current = all.find((u) => u.wallet.toLowerCase() === account.toLowerCase());
      if (!current) return alert("You must be registered to match!");

      const tx = await contract.matchUsers(current.id, userId);
      await tx.wait();
      alert("Matched successfully!");
    } catch (err) {
      console.error(err);
      alert("Error matching users");
    }
  }

  useEffect(() => {
    if (contract) loadUsers();
  }, [contract]);

  return (
    <div style={{ marginTop: "30px" }}>
      <h3>All Users</h3>
      {users.length ? (
        <ul style={{ listStyle: "none" }}>
          {users.map((u, i) => (
            <li key={i} style={{ margin: "10px 0" }}>
              <strong>{u.name}</strong> — teaches {u.skillToTeach}, learns {u.skillToLearn}
              {u.wallet.toLowerCase() !== account.toLowerCase() && (
                <button
                  onClick={() => matchWith(Number(u.id))}
                  style={{ marginLeft: "10px" }}
                >
                  Match
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No users yet</p>
      )}
    </div>
  );
}

export default UserList;
