export default function AuthWidget({ session, onLoginClick, onUploadClick, onLogout }) {
  return (
    <div className="auth-widget">
      {session ? (
        <div className="auth-status logged-in">
          <span className="agent-badge">🟢 特工在线</span>
          <button onClick={onUploadClick} className="auth-btn upload">📤 上报</button>
          <button onClick={onLogout} className="auth-btn logout">断开</button>
        </div>
      ) : (
        <button onClick={onLoginClick} className="auth-btn login">🔌 接入系统</button>
      )}
    </div>
  );
}
