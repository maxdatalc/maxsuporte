import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { FilialProvider } from "@/lib/filial";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ImplantacoesAdmin from "./pages/admin/ImplantacoesAdmin";
import NovaImplantacao from "./pages/admin/NovaImplantacao";
import EditarImplantacao from "./pages/admin/EditarImplantacao";
import UsuariosAdmin from "./pages/admin/UsuariosAdmin";
import FiliaisAdmin from "./pages/admin/FiliaisAdmin";
import RelatoriosProdutividade from "./pages/admin/RelatoriosProdutividade";
import DisponibilidadeCalendario from "./pages/admin/DisponibilidadeCalendario";
import ConfiguracaoComissoes from "./pages/admin/ConfiguracaoComissoes";
import RelatorioComissoes from "./pages/admin/RelatorioComissoes";
import SolicitacoesConclusao from "./pages/admin/SolicitacoesConclusao";
import ImplantadorDashboard from "./pages/implantador/ImplantadorDashboard";
import ImplantacaoDetalhe from "./pages/ImplantacaoDetalhe";
import VisitasList from "./pages/visitas/VisitasList";
import NovaVisita from "./pages/visitas/NovaVisita";
import VisitaDetalhe from "./pages/visitas/VisitaDetalhe";
import BaseConhecimentoIA from "./pages/admin/BaseConhecimentoIA";
import GuiaVisitas from "./pages/visitas/GuiaVisitas";
import MetricasIA from "./pages/admin/MetricasIA";
import DemandTemplates from "./pages/admin/DemandTemplates";
import DemandTemplateForm from "./pages/admin/DemandTemplateForm";
import DemandasList from "./pages/demandas/DemandasList";
import NovaDemanda from "./pages/demandas/NovaDemanda";
import DemandaDetalhe from "./pages/demandas/DemandaDetalhe";
import RelatorioDemandas from "./pages/admin/RelatorioDemandas";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import PerfilUsuario from "./pages/PerfilUsuario";
import BackupRestore from "./pages/admin/BackupRestore";
import VendasDashboard from "./pages/vendas/VendasDashboard";
import LeadsList from "./pages/vendas/LeadsList";
import PipelineKanban from "./pages/vendas/PipelineKanban";
import DealDetalhe from "./pages/vendas/DealDetalhe";
import ConfiguracoesCRM from "./pages/vendas/ConfiguracoesCRM";
import FormularioPublico from "./pages/vendas/FormularioPublico";
import OAuthConsent from "./pages/OAuthConsent";



const queryClient = new QueryClient();

function AppRoutes() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={user ? <Navigate to={role === "admin" ? "/admin" : role === "vendedor" ? "/vendas" : "/implantador"} replace /> : <Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/cadastro" element={user ? <Navigate to={role === "admin" ? "/admin" : role === "vendedor" ? "/vendas" : "/implantador"} replace /> : <Cadastro />} />
      <Route path="/formulario/:dealId/:token" element={<FormularioPublico />} />
      <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
      <Route path="/" element={user ? <Navigate to={role === "admin" ? "/admin" : role === "vendedor" ? "/vendas" : "/implantador"} replace /> : <Navigate to="/login" replace />} />


      {/* CRM / Vendas */}
      <Route path="/vendas" element={<ProtectedRoute allowedRoles={["admin", "vendedor"]}><VendasDashboard /></ProtectedRoute>} />
      <Route path="/vendas/leads" element={<ProtectedRoute allowedRoles={["admin", "vendedor"]}><LeadsList /></ProtectedRoute>} />
      <Route path="/vendas/pipeline" element={<ProtectedRoute allowedRoles={["admin", "vendedor"]}><PipelineKanban /></ProtectedRoute>} />
      <Route path="/vendas/deals/:id" element={<ProtectedRoute allowedRoles={["admin", "vendedor"]}><DealDetalhe /></ProtectedRoute>} />
      <Route path="/vendas/configuracoes" element={<ProtectedRoute allowedRoles={["admin"]}><ConfiguracoesCRM /></ProtectedRoute>} />
      <Route path="/vendas/perfil" element={<ProtectedRoute allowedRoles={["vendedor"]}><PerfilUsuario /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/implantacoes" element={<ProtectedRoute allowedRoles={["admin"]}><ImplantacoesAdmin /></ProtectedRoute>} />
      <Route path="/admin/implantacoes/nova" element={<ProtectedRoute allowedRoles={["admin"]}><NovaImplantacao /></ProtectedRoute>} />
      <Route path="/admin/implantacoes/:id" element={<ProtectedRoute allowedRoles={["admin"]}><ImplantacaoDetalhe /></ProtectedRoute>} />
      <Route path="/admin/minhas-implantacoes" element={<ProtectedRoute allowedRoles={["admin"]}><ImplantadorDashboard /></ProtectedRoute>} />
      <Route path="/admin/implantacoes/:id/editar" element={<ProtectedRoute allowedRoles={["admin"]}><EditarImplantacao /></ProtectedRoute>} />
      <Route path="/admin/usuarios" element={<ProtectedRoute allowedRoles={["admin"]}><UsuariosAdmin /></ProtectedRoute>} />
      <Route path="/admin/filiais" element={<ProtectedRoute allowedRoles={["admin"]}><FiliaisAdmin /></ProtectedRoute>} />
      <Route path="/admin/relatorios" element={<ProtectedRoute allowedRoles={["admin"]}><RelatoriosProdutividade /></ProtectedRoute>} />
      <Route path="/admin/disponibilidade" element={<ProtectedRoute allowedRoles={["admin"]}><DisponibilidadeCalendario /></ProtectedRoute>} />
      <Route path="/admin/comissoes" element={<ProtectedRoute allowedRoles={["admin"]}><ConfiguracaoComissoes /></ProtectedRoute>} />
      <Route path="/admin/relatorio-comissoes" element={<ProtectedRoute allowedRoles={["admin"]}><RelatorioComissoes /></ProtectedRoute>} />
      <Route path="/admin/solicitacoes-conclusao" element={<ProtectedRoute allowedRoles={["admin"]}><SolicitacoesConclusao /></ProtectedRoute>} />
      <Route path="/admin/visitas" element={<ProtectedRoute allowedRoles={["admin"]}><VisitasList /></ProtectedRoute>} />
      <Route path="/admin/visitas/nova" element={<ProtectedRoute allowedRoles={["admin"]}><NovaVisita /></ProtectedRoute>} />
      <Route path="/admin/visitas/:id" element={<ProtectedRoute allowedRoles={["admin"]}><VisitaDetalhe /></ProtectedRoute>} />
      <Route path="/admin/guia-visitas" element={<ProtectedRoute allowedRoles={["admin"]}><GuiaVisitas /></ProtectedRoute>} />
      <Route path="/admin/base-conhecimento" element={<ProtectedRoute allowedRoles={["admin"]}><BaseConhecimentoIA /></ProtectedRoute>} />
      <Route path="/admin/metricas-ia" element={<ProtectedRoute allowedRoles={["admin"]}><MetricasIA /></ProtectedRoute>} />
      {/* Demand routes - Admin */}
      <Route path="/admin/demandas" element={<ProtectedRoute allowedRoles={["admin"]}><DemandasList /></ProtectedRoute>} />
      <Route path="/admin/demandas/nova" element={<ProtectedRoute allowedRoles={["admin"]}><NovaDemanda /></ProtectedRoute>} />
      <Route path="/admin/demandas/:id" element={<ProtectedRoute allowedRoles={["admin"]}><DemandaDetalhe /></ProtectedRoute>} />
      <Route path="/admin/demandas/modelos" element={<ProtectedRoute allowedRoles={["admin"]}><DemandTemplates /></ProtectedRoute>} />
      <Route path="/admin/demandas/modelos/novo" element={<ProtectedRoute allowedRoles={["admin"]}><DemandTemplateForm /></ProtectedRoute>} />
      <Route path="/admin/demandas/modelos/:id" element={<ProtectedRoute allowedRoles={["admin"]}><DemandTemplateForm /></ProtectedRoute>} />
      <Route path="/admin/relatorio-demandas" element={<ProtectedRoute allowedRoles={["admin"]}><RelatorioDemandas /></ProtectedRoute>} />

      {/* Implantador/Analista routes */}
      <Route path="/implantador" element={<ProtectedRoute allowedRoles={["implantador"]}><ImplantadorDashboard /></ProtectedRoute>} />
      <Route path="/implantador/implantacoes" element={<ProtectedRoute allowedRoles={["implantador"]}><ImplantadorDashboard /></ProtectedRoute>} />
      <Route path="/implantador/implantacoes/:id" element={<ProtectedRoute allowedRoles={["implantador"]}><ImplantacaoDetalhe /></ProtectedRoute>} />
      <Route path="/implantador/relatorio-comissoes" element={<ProtectedRoute allowedRoles={["implantador"]}><RelatorioComissoes /></ProtectedRoute>} />
      <Route path="/implantador/visitas" element={<ProtectedRoute allowedRoles={["implantador"]}><VisitasList /></ProtectedRoute>} />
      <Route path="/implantador/visitas/nova" element={<ProtectedRoute allowedRoles={["implantador"]}><NovaVisita /></ProtectedRoute>} />
      <Route path="/implantador/visitas/:id" element={<ProtectedRoute allowedRoles={["implantador"]}><VisitaDetalhe /></ProtectedRoute>} />
      <Route path="/implantador/guia-visitas" element={<ProtectedRoute allowedRoles={["implantador"]}><GuiaVisitas /></ProtectedRoute>} />
      {/* Demand routes - Analista */}
      <Route path="/implantador/demandas" element={<ProtectedRoute allowedRoles={["implantador"]}><DemandasList /></ProtectedRoute>} />
      <Route path="/implantador/demandas/:id" element={<ProtectedRoute allowedRoles={["implantador"]}><DemandaDetalhe /></ProtectedRoute>} />
      <Route path="/implantador/perfil" element={<ProtectedRoute allowedRoles={["implantador"]}><PerfilUsuario /></ProtectedRoute>} />
      <Route path="/admin/perfil" element={<ProtectedRoute allowedRoles={["admin"]}><PerfilUsuario /></ProtectedRoute>} />
      <Route path="/admin/backup" element={<ProtectedRoute allowedRoles={["admin"]}><BackupRestore /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <FilialProvider>
            <AppRoutes />
          </FilialProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
