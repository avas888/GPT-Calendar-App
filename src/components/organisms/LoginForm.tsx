import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Card } from '../atoms/Card';
import { Calendar, Info, AlertCircle, CheckCircle, UserPlus, LogIn, RefreshCw } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const { signIn, signUp, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: ''
  });

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      const errorString = error.message.toLowerCase();
      
      // Check for user already exists error
      if (errorString.includes('user already registered') || 
          errorString.includes('user_already_exists')) {
        return 'Este correo electrónico ya está registrado. Cambiando a modo de inicio de sesión...';
      }
      
      // Check for invalid credentials error
      if (errorString.includes('invalid login credentials') || 
          errorString.includes('invalid_credentials')) {
        return 'Credenciales inválidas. Verifica tu email y contraseña, o que tu cuenta esté confirmada en Supabase.';
      }
      
      // Check for email not confirmed
      if (errorString.includes('email not confirmed') || 
          errorString.includes('signup_disabled')) {
        return 'Tu cuenta necesita ser confirmada. Revisa tu email o confirma manualmente en el dashboard de Supabase.';
      }
      
      // Return original message for other specific errors
      return error.message;
    }
    
    return 'Error en la autenticación';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');
    setSuccess('');

    if (!formData.email || !formData.password) {
      setError('Por favor completa todos los campos requeridos.');
      setFormLoading(false);
      return;
    }

    if (!isLogin && !formData.nombre) {
      setError('Por favor ingresa tu nombre completo.');
      setFormLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      setFormLoading(false);
      return;
    }

    try {
      if (isLogin) {
        console.log('Attempting to sign in with:', formData.email);
        const result = await signIn(formData.email, formData.password);
        console.log('Sign in result:', result);
        
        if (result.user) {
          setSuccess('Inicio de sesión exitoso. Redirigiendo...');
        }
      } else {
        console.log('Attempting to sign up with:', formData.email);
        const result = await signUp(formData.email, formData.password, formData.nombre);
        console.log('Sign up result:', result);
        
        // Handle the case where user already exists
        if (result.userAlreadyExists) {
          setSuccess('Este correo ya está registrado. Cambiando a modo de inicio de sesión...');
          setIsLogin(true);
          // Keep the email and password for easy login
          setFormData(prev => ({ ...prev, nombre: '' }));
          setFormLoading(false);
          return;
        }
        
        if (result.user) {
          if (!result.session) {
            setSuccess('Cuenta creada exitosamente. Si no puedes iniciar sesión, verifica tu email o confirma la cuenta en Supabase.');
            setIsLogin(true);
            setFormData(prev => ({ ...prev, nombre: '' }));
          } else {
            setSuccess('Cuenta creada e iniciada sesión exitosamente. Redirigiendo...');
          }
        }
      }
    } catch (err: unknown) {
      console.error('Authentication error:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      
      // Auto-switch to login mode if user already exists
      if (errorMessage.includes('ya está registrado')) {
        setTimeout(() => {
          setIsLogin(true);
          setFormData(prev => ({ ...prev, nombre: '' }));
          setError('');
          setSuccess('Cambiado a modo de inicio de sesión. Intenta iniciar sesión ahora.');
        }, 2000);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    // Clear errors when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const createAdminAccount = async () => {
    setFormLoading(true);
    setError('');
    setSuccess('');
    
    try {
      console.log('Creating admin account...');
      const result = await signUp('admin@agendapro.com', 'admin123', 'Administrador');
      
      // Handle the case where user already exists
      if (result.userAlreadyExists) {
        setSuccess('La cuenta de administrador ya existe. Cargando credenciales para iniciar sesión...');
        setFormData({
          email: 'admin@agendapro.com',
          password: 'admin123',
          nombre: 'Administrador'
        });
        setIsLogin(true);
        setFormLoading(false);
        return;
      }
      
      if (result.user) {
        if (result.session) {
          setSuccess('Cuenta de administrador creada e iniciada sesión exitosamente.');
        } else {
          setSuccess('Cuenta de administrador creada. Cargando credenciales para iniciar sesión...');
          setFormData({
            email: 'admin@agendapro.com',
            password: 'admin123',
            nombre: 'Administrador'
          });
          setIsLogin(true);
        }
      }
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      console.error('Error creating admin account:', err);
      
      // If user already exists, still load the credentials
      if (errorMessage.includes('ya está registrado')) {
        setSuccess('La cuenta de administrador ya existe. Cargando credenciales...');
        setFormData({
          email: 'admin@agendapro.com',
          password: 'admin123',
          nombre: 'Administrador'
        });
        setIsLogin(true);
      } else {
        setError(`Error creando cuenta de administrador: ${errorMessage}`);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const loginAsAdmin = () => {
    setFormData({
      email: 'admin@agendapro.com',
      password: 'admin123',
      nombre: 'Administrador'
    });
    setIsLogin(true);
    setError('');
    setSuccess('Credenciales de administrador cargadas. Haz clic en "Iniciar Sesión".');
  };

  const resetForm = () => {
    setFormData({ email: '', password: '', nombre: '' });
    setError('');
    setSuccess('');
  };

  const isLoading = loading || formLoading;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Calendar className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            AgendaPro
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin ? 'Inicia sesión en tu cuenta' : 'Crea tu cuenta nueva'}
          </p>
        </div>

        <Card className="mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-blue-800 font-medium mb-1">Configuración Inicial</p>
              <p className="text-blue-700 mb-2">
                Para acceder como administrador por primera vez:
              </p>
              <ol className="text-blue-700 text-xs space-y-1 mb-3">
                <li>1. Haz clic en "Crear Admin" para registrar la cuenta</li>
                <li>2. Luego usa "Login Admin" para cargar las credenciales</li>
                <li>3. Finalmente haz clic en "Iniciar Sesión"</li>
              </ol>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={createAdminAccount}
                  className="text-xs flex items-center gap-1"
                  disabled={isLoading}
                >
                  <UserPlus className="w-3 h-3" />
                  Crear Admin
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={loginAsAdmin}
                  className="text-xs flex items-center gap-1"
                  disabled={isLoading}
                >
                  <LogIn className="w-3 h-3" />
                  Login Admin
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={resetForm}
                  className="text-xs flex items-center gap-1"
                  disabled={isLoading}
                >
                  <RefreshCw className="w-3 h-3" />
                  Limpiar
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Advanced troubleshooting section */}
        <Card className="mb-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm">
              <button
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="text-yellow-800 font-medium mb-1 hover:underline"
              >
                Solución de Problemas {showAdvancedOptions ? '▼' : '▶'}
              </button>
              {showAdvancedOptions && (
                <div className="text-yellow-700 text-xs space-y-2 mt-2">
                  <p><strong>Si ves "Invalid login credentials":</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Ve al dashboard de Supabase → Authentication → Users</li>
                    <li>Busca tu usuario (ej: admin@agendapro.com)</li>
                    <li>Si está "Unconfirmed", confírmalo manualmente</li>
                    <li>Si no recuerdas la contraseña, resetéala desde el dashboard</li>
                  </ul>
                  <p><strong>Si ves "User already registered":</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>El usuario ya existe, usa "Login Admin" para cargar credenciales</li>
                    <li>Si no funciona, verifica el estado del usuario en Supabase</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input
                label="Nombre completo"
                name="nombre"
                type="text"
                required
                value={formData.nombre}
                onChange={handleInputChange}
                placeholder="Tu nombre completo"
                disabled={isLoading}
              />
            )}
            
            <Input
              label="Correo electrónico"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              placeholder="correo@ejemplo.com"
              disabled={isLoading}
            />
            
            <Input
              label="Contraseña"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleInputChange}
              placeholder="••••••••"
              helper={!isLogin ? "Mínimo 6 caracteres" : undefined}
              disabled={isLoading}
            />

            {error && (
              <div className="flex items-center text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                {success}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
              disabled={isLoading}
            >
              {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setSuccess('');
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
              disabled={isLoading}
            >
              {isLogin 
                ? '¿No tienes cuenta? Regístrate' 
                : '¿Ya tienes cuenta? Inicia sesión'
              }
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};