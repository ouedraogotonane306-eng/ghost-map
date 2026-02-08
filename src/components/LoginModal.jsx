export default function LoginModal({ show, onClose, email, setEmail, password, setPassword, onSubmit, loading }) {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>🔒 身份识别终端</h3>
        <p>请输入特工密钥以解锁全局权限</p>
        <form onSubmit={onSubmit} className="global-login-form">
          <input type="text" placeholder="特工 ID" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
          <input type="password" placeholder="访问口令" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="submit" disabled={loading}>{loading ? '验证中...' : '确认接入'}</button>
        </form>
      </div>
    </div>
  );
}
