import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Zap, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { authService } from "../../services/authService";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch {
      setError("Ocorreu um erro. Tente novamente em instantes.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Zap size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">TaskFlow</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8">
          {sent ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-green-600 dark:text-green-400" />
                </div>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">E-mail enviado!</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Se o endereço <strong>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha em breve.
              </p>
              <Link to="/login" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium flex items-center justify-center gap-1.5">
                <ArrowLeft size={14} /> Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Esqueceu a senha?</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Informe seu e-mail e enviaremos um link para redefinir sua senha.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                  <AlertCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">E-mail</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {isLoading ? "Enviando..." : "Enviar link de redefinição"}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium flex items-center justify-center gap-1.5">
                  <ArrowLeft size={14} /> Voltar para o login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
