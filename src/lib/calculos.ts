import { format, addMinutes, isBefore, isAfter, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Cita, Servicio, Disponibilidad } from './supabaseClient';

export const formatearFecha = (fecha: string): string => {
  return format(parseISO(fecha), 'dd/MM/yyyy', { locale: es });
};

export const formatearHora = (hora: string): string => {
  return format(parseISO(`2000-01-01T${hora}`), 'HH:mm');
};

export const calcularDuracionTotal = (servicios: Servicio[]): number => {
  return servicios.reduce((total, servicio) => total + servicio.duracion_min, 0);
};

export const calcularPrecioTotal = (servicios: Servicio[]): number => {
  return servicios.reduce((total, servicio) => total + servicio.precio, 0);
};

export const generarHorariosDisponibles = (
  fecha: string,
  disponibilidad: Disponibilidad[],
  citasExistentes: Cita[],
  duracionRequerida: number
): string[] => {
  const diaSemana = new Date(fecha).getDay();
  const disponibilidadDia = disponibilidad.filter(d => d.dia_semana === diaSemana);
  
  if (disponibilidadDia.length === 0) return [];

  const horarios: string[] = [];
  
  disponibilidadDia.forEach(disp => {
    const inicio = parseISO(`${fecha}T${disp.hora_inicio}`);
    const fin = parseISO(`${fecha}T${disp.hora_fin}`);
    
    let horaActual = inicio;
    
    while (isBefore(addMinutes(horaActual, duracionRequerida), fin) || 
           horaActual.getTime() === addMinutes(fin, -duracionRequerida).getTime()) {
      
      const horaFin = addMinutes(horaActual, duracionRequerida);
      const estaOcupado = citasExistentes.some(cita => {
        const citaInicio = parseISO(`${cita.fecha}T${cita.hora_inicio}`);
        const citaFin = parseISO(`${cita.fecha}T${cita.hora_fin}`);
        
        return (
          (isAfter(horaActual, citaInicio) && isBefore(horaActual, citaFin)) ||
          (isAfter(horaFin, citaInicio) && isBefore(horaFin, citaFin)) ||
          (isBefore(horaActual, citaInicio) && isAfter(horaFin, citaFin))
        );
      });
      
      if (!estaOcupado) {
        horarios.push(format(horaActual, 'HH:mm'));
      }
      
      horaActual = addMinutes(horaActual, 30);
    }
  });
  
  return horarios;
};

export const validarHorarioComercial = (hora: string): boolean => {
  const [horas, minutos] = hora.split(':').map(Number);
  const totalMinutos = horas * 60 + minutos;
  
  return totalMinutos >= 480 && totalMinutos <= 1200;
};

export const obtenerProximasCitas = (citas: Cita[], limite: number = 5): Cita[] => {
  const ahora = new Date();
  
  return citas
    .filter(cita => {
      const fechaCita = parseISO(`${cita.fecha}T${cita.hora_inicio}`);
      return isAfter(fechaCita, ahora) && cita.estado === 'confirmada';
    })
    .sort((a, b) => {
      const fechaA = parseISO(`${a.fecha}T${a.hora_inicio}`);
      const fechaB = parseISO(`${b.fecha}T${b.hora_inicio}`);
      return fechaA.getTime() - fechaB.getTime();
    })
    .slice(0, limite);
};