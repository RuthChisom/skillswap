function ConnectWallet({ connect }) {
  return (
    <button onClick={connect} style={{ padding: "10px 20px", marginTop: "20px" }}>
      Connect Wallet
    </button>
  );
}
export default ConnectWallet;
