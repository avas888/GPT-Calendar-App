import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Card } from '../atoms/Card';
import { Calendar, Info, AlertCircle, CheckCircle } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const { signIn, signUp, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
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
        return 'Este correo electrónico ya está registrado. Por favor, inicia sesión.';
      }
      
      // Check for invalid credentials error
      if (errorString.includes('invalid login credentials') || 
          errorString.includes('invalid_credentials')) {
        return 'Credenciales inválidas. Por favor, verifica tu correo y contraseña.';
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
        
        if (result.user) {
          if (!result.session) {
            setSuccess('Cuenta creada exitosamente. Por favor verifica tu email antes de iniciar sesión.');
            setIsLogin(true);
            setFormData({ email: formData.email, password: '', nombre: '' });
          } else {
            setSuccess('Cuenta creada e iniciada sesión exitosamente. Redirigiendo...');
          }
        }
      }
    } catch (err: unknown) {
      console.error('Authentication error:', err);
      setError(getErrorMessage(err));
    } finally {
      setFormLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const fillAdminCredentials = () => {
    setFormData({
      email: 'admin@agendapro.com',
      password: 'admin123',
      nombre: 'Administrador'
    });
    setIsLogin(false);
  };

  const fillTestCredentials = () => {
    setFormData({
      email: 'admin@agendapro.com',
      password: 'admin123',
      nombre: 'Administrador'
    });
    setIsLogin(true);
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
                Para acceder como administrador:
              </p>
              <ol className="text-blue-700 text-xs space-y-1 mb-3">
                <li>1. Crea una cuenta con email: admin@agendapro.com</li>
                <li>2. Se asignará automáticamente el rol de administrador</li>
                <li>3. Podrás acceder a todas las funciones</li>
              </ol>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={fillAdminCredentials}
                  className="text-xs"
                  disabled={isLoading}
                >
                  Crear Admin
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={fillTestCredentials}
                  className="text-xs"
                  disabled={isLoading}
                >
                  Login Admin
                </Button>
              </div>
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