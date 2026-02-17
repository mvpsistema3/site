import React, { useState } from 'react';
import { X, Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { useBrandColors } from '../hooks/useTheme';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalView = 'login' | 'register';

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signUp } = useAuth();
  const { currentSlug } = useBrand();
  const { primaryColor } = useBrandColors();

  const [view, setView] = useState<ModalView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError(null);
    setSuccessMessage(null);
    setView('login');
    setShowPassword(false);
    setShowRegisterPassword(false);
    onClose();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message || 'Erro ao fazer login. Verifique suas credenciais.');
      setLoading(false);
    } else {
      setLoading(false);
      handleClose();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    const { error: signUpError } = await signUp(email, password, displayName, currentSlug);

    if (signUpError) {
      setError(signUpError.message || 'Erro ao criar conta. Tente novamente.');
      setLoading(false);
    } else {
      setSuccessMessage('Conta criada! Verifique seu email para confirmar.');
      setLoading(false);
      setTimeout(() => {
        handleClose();
      }, 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;500;600;700&family=General+Sans:wght@400;500;600&display=swap');

        @keyframes modalFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .login-modal-backdrop {
          animation: modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .login-modal-content {
          animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: 'General Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .login-modal-title {
          font-family: 'Clash Display', -apple-system, BlinkMacSystemFont, sans-serif;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .login-modal-input {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .login-modal-input:focus {
          transform: translateY(-1px);
        }

        .login-modal-button {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }

        .login-modal-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        .login-modal-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-modal-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -200%;
          width: 200%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s;
        }

        .login-modal-button:hover:not(:disabled)::before {
          left: 200%;
        }

        .login-modal-link {
          position: relative;
          display: inline-block;
        }

        .login-modal-link::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 2px;
          background: currentColor;
          transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .login-modal-link:hover::after {
          width: 100%;
        }

        .login-modal-content::-webkit-scrollbar {
          display: none;
        }

        .login-modal-content {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div
        className="login-modal-backdrop fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <div className="login-modal-content bg-white w-full max-w-md relative shadow-2xl"
          style={{
            borderRadius: '20px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-all duration-300 hover:rotate-90 z-10"
            aria-label="Fechar"
            style={{
              padding: '8px',
              borderRadius: '50%',
              background: 'transparent',
              border: 'none'
            }}
          >
            <X size={20} strokeWidth={2} />
          </button>

          {/* Header */}
          <div className="px-8 pt-8 pb-4">
            <h2
              className="login-modal-title text-3xl text-gray-900"
              style={{
                lineHeight: '1.1'
              }}
            >
              {view === 'login' ? 'Bem-vindo' : 'Criar Conta'}
            </h2>
            <p
              className="text-gray-500 text-sm mt-2"
              style={{
                letterSpacing: '-0.01em'
              }}
            >
              {view === 'login' ? 'Entre com suas credenciais' : 'Cadastre-se gratuitamente'}
            </p>
          </div>

          {/* Content */}
          <div className="px-8 pb-8">
            {/* Success Message */}
            {successMessage && (
              <div
                className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 text-green-800 text-sm"
                style={{
                  borderRadius: '12px'
                }}
              >
                {successMessage}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div
                className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-800 text-sm"
                style={{
                  borderRadius: '12px'
                }}
              >
                {error}
              </div>
            )}

            {/* Login Form */}
            {view === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="login-modal-input w-full pl-11 pr-4 py-3 border-2 border-gray-200 focus:border-gray-900 outline-none text-base"
                      style={{ borderRadius: '12px' }}
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="login-modal-input w-full pl-11 pr-12 py-3 border-2 border-gray-200 focus:border-gray-900 outline-none text-base"
                      style={{ borderRadius: '12px' }}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors duration-200"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="login-modal-button w-full text-white font-medium py-3.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base mt-6"
                  style={{
                    backgroundColor: primaryColor || '#000',
                    borderRadius: '12px',
                    letterSpacing: '-0.01em'
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </button>
              </form>
            )}

            {/* Register Form */}
            {view === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label htmlFor="display-name" className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">
                    Nome <span className="text-gray-400 lowercase normal-case">(opcional)</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      id="display-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="login-modal-input w-full pl-11 pr-4 py-3 border-2 border-gray-200 focus:border-gray-900 outline-none text-base"
                      style={{ borderRadius: '12px' }}
                      placeholder="Seu nome"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="register-email" className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      id="register-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="login-modal-input w-full pl-11 pr-4 py-3 border-2 border-gray-200 focus:border-gray-900 outline-none text-base"
                      style={{ borderRadius: '12px' }}
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="register-password" className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">
                    Senha <span className="text-gray-400 lowercase normal-case">(mín. 6 caracteres)</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      id="register-password"
                      type={showRegisterPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="login-modal-input w-full pl-11 pr-12 py-3 border-2 border-gray-200 focus:border-gray-900 outline-none text-base"
                      style={{ borderRadius: '12px' }}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors duration-200"
                      aria-label={showRegisterPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showRegisterPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="login-modal-button w-full text-white font-medium py-3.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base mt-6"
                  style={{
                    backgroundColor: primaryColor || '#000',
                    borderRadius: '12px',
                    letterSpacing: '-0.01em'
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Criar Conta'
                  )}
                </button>
              </form>
            )}

            {/* Footer Links */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              {view === 'login' ? (
                <div className="text-center">
                  <span className="text-gray-600 text-sm">Não tem conta?</span>
                  {' '}
                  <button
                    type="button"
                    onClick={() => setView('register')}
                    className="login-modal-link font-semibold text-sm transition-colors duration-200"
                    style={{ color: primaryColor || '#000' }}
                  >
                    Criar conta
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-gray-600 text-sm">Já tem conta?</span>
                  {' '}
                  <button
                    type="button"
                    onClick={() => setView('login')}
                    className="login-modal-link font-semibold text-sm transition-colors duration-200"
                    style={{ color: primaryColor || '#000' }}
                  >
                    Entrar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
