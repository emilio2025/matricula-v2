import { Routes, Route } from 'react-router-dom';
import PublicLayout from './components/PublicLayout';
import PanelLayout from './components/PanelLayout';
import ProtectedRoute from './components/ProtectedRoute';

import Inicio from './pages/publico/Inicio';
import Oferta from './pages/publico/Oferta';
import Requisitos from './pages/publico/Requisitos';
import Vacantes from './pages/publico/Vacantes';
import Login from './pages/publico/Login';
import Registro from './pages/publico/Registro';
import NoEncontrado from './pages/publico/NoEncontrado';

import MisSolicitudes from './pages/apoderado/MisSolicitudes';
import NuevaMatricula from './pages/apoderado/NuevaMatricula';
import DetalleSolicitud from './pages/apoderado/DetalleSolicitud';

import Solicitudes from './pages/secretaria/Solicitudes';
import RevisarSolicitud from './pages/secretaria/RevisarSolicitud';
import GestionVacantes from './pages/secretaria/GestionVacantes';

import Dashboard from './pages/director/Dashboard';
import Configuracion from './pages/director/Configuracion';
import Nominas from './pages/secretaria/Nominas';
import Perfil from './pages/comun/Perfil';
import PreguntasFrecuentes from './pages/publico/PreguntasFrecuentes';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Inicio />} />
        <Route path="/oferta" element={<Oferta />} />
        <Route path="/requisitos" element={<Requisitos />} />
        <Route path="/vacantes" element={<Vacantes />} />
        <Route path="/preguntas" element={<PreguntasFrecuentes />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
      </Route>

      <Route element={<ProtectedRoute roles={['apoderado']}><PanelLayout /></ProtectedRoute>}>
        <Route path="/portal" element={<MisSolicitudes />} />
        <Route path="/portal/nueva" element={<NuevaMatricula />} />
        <Route path="/portal/solicitud/:id" element={<DetalleSolicitud />} />
        <Route path="/portal/perfil" element={<Perfil />} />
      </Route>

      <Route element={<ProtectedRoute roles={['secretaria']}><PanelLayout /></ProtectedRoute>}>
        <Route path="/secretaria" element={<Solicitudes />} />
        <Route path="/secretaria/solicitud/:id" element={<RevisarSolicitud />} />
        <Route path="/secretaria/vacantes" element={<GestionVacantes />} />
        <Route path="/secretaria/nominas" element={<Nominas />} />
        <Route path="/secretaria/perfil" element={<Perfil />} />
      </Route>

      <Route element={<ProtectedRoute roles={['director']}><PanelLayout /></ProtectedRoute>}>
        <Route path="/director" element={<Dashboard />} />
        <Route path="/director/solicitudes" element={<Solicitudes soloLectura />} />
        <Route path="/director/solicitud/:id" element={<DetalleSolicitud vista="director" />} />
        <Route path="/director/nominas" element={<Nominas />} />
        <Route path="/director/configuracion" element={<Configuracion />} />
        <Route path="/director/perfil" element={<Perfil />} />
      </Route>

      <Route path="*" element={<NoEncontrado />} />
    </Routes>
  );
}
