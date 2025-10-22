import { useState } from "react";

function RegisterForm({ contract, onRegistered }) {
  const [form, setForm] = useState({ name: "", teach: "", learn: "" });

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const tx = await contract.registerUser(form.name, form.teach, form.learn);
      await tx.wait();
      alert("User registered successfully!");
      setForm({ name: "", teach: "", learn: "" });
      // window.location.reload();
      if (onRegistered) onRegistered(); // ✅ notify parent
    } catch (err) {
      console.error(err);
      alert("Error registering user");
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "20px" }}>
      <input
        placeholder="Your name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <input
        placeholder="Skill to teach"
        value={form.teach}
        onChange={(e) => setForm({ ...form, teach: e.target.value })}
      />
      <input
        placeholder="Skill to learn"
        value={form.learn}
        onChange={(e) => setForm({ ...form, learn: e.target.value })}
      />
      <button type="submit">Register</button>
    </form>
  );
}

export default RegisterForm;
