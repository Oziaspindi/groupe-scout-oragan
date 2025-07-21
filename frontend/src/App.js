import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('adminToken'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);

  const login = (newToken) => {
    localStorage.setItem('adminToken', newToken);
    setToken(newToken);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Components
const Header = ({ onAdminClick }) => {
  return (
    <header className="bg-gradient-to-r from-blue-800 to-green-600 text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Groupe Scout Ouragan</h1>
            <p className="text-blue-100 mt-2">Aventure • Fraternité • Service</p>
          </div>
          <button
            onClick={onAdminClick}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
          >
            Espace Admin
          </button>
        </div>
      </div>
    </header>
  );
};

const BranchCard = ({ branch, memberCount, activities }) => {
  const [showMembers, setShowMembers] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const [members, setMembers] = useState([]);
  const [branchActivities, setBranchActivities] = useState([]);

  const loadMembers = async () => {
    try {
      const response = await axios.get(`${API}/members/${branch.type}`);
      setMembers(response.data);
      setShowMembers(true);
    } catch (error) {
      console.error('Erreur lors du chargement des membres:', error);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await axios.get(`${API}/activities/${branch.type}`);
      setBranchActivities(response.data);
      setShowActivities(true);
    } catch (error) {
      console.error('Erreur lors du chargement des activités:', error);
    }
  };

  const getBranchColor = (type) => {
    const colors = {
      meute: 'bg-yellow-500',
      troupe: 'bg-green-500',
      compagnie: 'bg-blue-500',
      clan: 'bg-purple-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className={`${getBranchColor(branch.type)} text-white p-6`}>
        <h3 className="text-2xl font-bold">{branch.name}</h3>
        <p className="text-white/90">{branch.age_range}</p>
        <p className="text-sm mt-2">{branch.description}</p>
      </div>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-600">Membres actifs: <strong>{memberCount}</strong></span>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={loadMembers}
            className="w-full bg-gray-100 hover:bg-gray-200 py-2 px-4 rounded-lg transition-colors text-left"
          >
            {showMembers ? 'Masquer les membres' : 'Voir les membres'}
          </button>
          
          {showMembers && (
            <div className="bg-gray-50 p-4 rounded-lg">
              {members.length > 0 ? (
                <div className="grid gap-2">
                  {members.map(member => (
                    <div key={member.id} className="flex justify-between items-center py-1">
                      <span>{member.prenom} {member.nom}</span>
                      <span className="text-gray-500 text-sm">{member.age} ans</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Aucun membre dans cette branche</p>
              )}
            </div>
          )}
          
          <button
            onClick={loadActivities}
            className="w-full bg-gray-100 hover:bg-gray-200 py-2 px-4 rounded-lg transition-colors text-left"
          >
            {showActivities ? 'Masquer les activités' : 'Voir les activités'}
          </button>
          
          {showActivities && (
            <div className="bg-gray-50 p-4 rounded-lg">
              {branchActivities.length > 0 ? (
                <div className="space-y-3">
                  {branchActivities.map(activity => (
                    <div key={activity.id} className="border-l-4 border-blue-400 pl-4">
                      <h4 className="font-semibold">{activity.titre}</h4>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.date_activite).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Aucune activité prévue</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PublicHome = ({ onAdminClick }) => {
  const [branches, setBranches] = useState([]);
  const [organs, setOrgans] = useState([]);
  const [memberCounts, setMemberCounts] = useState({});
  const [project, setProject] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load branches info
      const branchesResponse = await axios.get(`${API}/branches`);
      setBranches(branchesResponse.data.branches);
      setOrgans(branchesResponse.data.organs);

      // Load members count per branch
      const membersResponse = await axios.get(`${API}/members`);
      const members = membersResponse.data;
      const counts = {
        meute: members.filter(m => m.branch === 'meute').length,
        troupe: members.filter(m => m.branch === 'troupe').length,
        compagnie: members.filter(m => m.branch === 'compagnie').length,
        clan: members.filter(m => m.branch === 'clan').length,
      };
      setMemberCounts(counts);

      // Load pedagogical project
      const projectResponse = await axios.get(`${API}/project`);
      setProject(projectResponse.data);

      // Load recent activities
      const activitiesResponse = await axios.get(`${API}/activities`);
      setRecentActivities(activitiesResponse.data.slice(0, 5));

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onAdminClick={onAdminClick} />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Bienvenue dans notre groupe scout</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Rejoignez-nous dans l'aventure du scoutisme ! Découvrez nos différentes branches et 
            participez à nos activités enrichissantes.
          </p>
        </section>

        {/* Branches Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">Nos Branches</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {branches.map(branch => (
              <BranchCard
                key={branch.type}
                branch={branch}
                memberCount={memberCounts[branch.type] || 0}
              />
            ))}
          </div>
        </section>

        {/* Organs Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">Nos Organes</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {organs.map(organ => (
              <div key={organ.type} className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{organ.name}</h3>
                <p className="text-gray-600">{organ.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Activities */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">Activités Récentes</h2>
          <div className="bg-white rounded-lg shadow-lg p-6">
            {recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.map(activity => (
                  <div key={activity.id} className="border-l-4 border-green-400 pl-6 py-2">
                    <h3 className="font-semibold text-lg">{activity.titre}</h3>
                    <p className="text-gray-600">{activity.description}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-gray-500">
                        {new Date(activity.date_activite).toLocaleDateString('fr-FR')}
                      </span>
                      {activity.branch && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          {activity.branch.charAt(0).toUpperCase() + activity.branch.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center">Aucune activité récente</p>
            )}
          </div>
        </section>

        {/* Pedagogical Project */}
        {project && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">Projet Pédagogique</h2>
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">{project.titre}</h3>
              <div className="prose max-w-none">
                {project.contenu.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2024 Groupe Scout Ouragan. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

const AdminLogin = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API}/auth/login`, credentials);
      onLogin(response.data.access_token);
    } catch (error) {
      setError('Nom d\'utilisateur ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Connexion Admin</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Nom d'utilisateur
            </label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [project, setProject] = useState({ titre: '', contenu: '' });

  useEffect(() => {
    loadStats();
    loadMembers();
    loadActivities();
    loadProject();
  }, []);

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

  const loadMembers = async () => {
    try {
      const response = await axios.get(`${API}/members`);
      setMembers(response.data);
    } catch (error) {
      console.error('Erreur membres:', error);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await axios.get(`${API}/activities`);
      setActivities(response.data);
    } catch (error) {
      console.error('Erreur activités:', error);
    }
  };

  const loadProject = async () => {
    try {
      const response = await axios.get(`${API}/project`);
      setProject(response.data);
    } catch (error) {
      console.error('Erreur projet:', error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Tableau de Bord</h2>
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-yellow-100 p-6 rounded-lg">
                  <h3 className="font-bold text-yellow-800">Meute</h3>
                  <p className="text-2xl font-bold text-yellow-900">{stats.members_by_branch.meute}</p>
                </div>
                <div className="bg-green-100 p-6 rounded-lg">
                  <h3 className="font-bold text-green-800">Troupe</h3>
                  <p className="text-2xl font-bold text-green-900">{stats.members_by_branch.troupe}</p>
                </div>
                <div className="bg-blue-100 p-6 rounded-lg">
                  <h3 className="font-bold text-blue-800">Compagnie</h3>
                  <p className="text-2xl font-bold text-blue-900">{stats.members_by_branch.compagnie}</p>
                </div>
                <div className="bg-purple-100 p-6 rounded-lg">
                  <h3 className="font-bold text-purple-800">Clan</h3>
                  <p className="text-2xl font-bold text-purple-900">{stats.members_by_branch.clan}</p>
                </div>
              </div>
            )}
          </div>
        );
      case 'members':
        return <MembersManagement members={members} onUpdate={loadMembers} />;
      case 'activities':
        return <ActivitiesManagement activities={activities} onUpdate={loadActivities} />;
      case 'project':
        return <ProjectManagement project={project} onUpdate={loadProject} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-800 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Administration - Groupe Scout Ouragan</h1>
          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <div className="container mx-auto p-4">
        <nav className="bg-white rounded-lg shadow mb-6">
          <div className="flex space-x-1 p-1">
            {[
              { key: 'dashboard', label: 'Tableau de Bord' },
              { key: 'members', label: 'Membres' },
              { key: 'activities', label: 'Activités' },
              { key: 'project', label: 'Projet Pédagogique' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded font-medium ${
                  activeTab === tab.key 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <main className="bg-white rounded-lg shadow p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

const MembersManagement = ({ members, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    nom: '', prenom: '', age: '', branch: 'meute'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const memberData = { ...formData, age: parseInt(formData.age) };
      
      if (editingMember) {
        await axios.put(`${API}/admin/members/${editingMember.id}`, memberData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
      } else {
        await axios.post(`${API}/admin/members`, memberData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
      }
      
      setFormData({ nom: '', prenom: '', age: '', branch: 'meute' });
      setShowForm(false);
      setEditingMember(null);
      onUpdate();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setFormData({
      nom: member.nom,
      prenom: member.prenom,
      age: member.age.toString(),
      branch: member.branch
    });
    setShowForm(true);
  };

  const handleDelete = async (memberId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) {
      try {
        await axios.delete(`${API}/admin/members/${memberId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
        onUpdate();
      } catch (error) {
        console.error('Erreur:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des Membres</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Ajouter un membre
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nom"
              value={formData.nom}
              onChange={(e) => setFormData({...formData, nom: e.target.value})}
              className="px-3 py-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Prénom"
              value={formData.prenom}
              onChange={(e) => setFormData({...formData, prenom: e.target.value})}
              className="px-3 py-2 border rounded"
              required
            />
            <input
              type="number"
              placeholder="Âge"
              value={formData.age}
              onChange={(e) => setFormData({...formData, age: e.target.value})}
              className="px-3 py-2 border rounded"
              required
            />
            <select
              value={formData.branch}
              onChange={(e) => setFormData({...formData, branch: e.target.value})}
              className="px-3 py-2 border rounded"
            >
              <option value="meute">Meute</option>
              <option value="troupe">Troupe</option>
              <option value="compagnie">Compagnie</option>
              <option value="clan">Clan</option>
            </select>
          </div>
          <div className="flex space-x-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
              {editingMember ? 'Modifier' : 'Ajouter'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingMember(null);
                setFormData({ nom: '', prenom: '', age: '', branch: 'meute' });
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-50">
              <th className="border p-2 text-left">Nom</th>
              <th className="border p-2 text-left">Prénom</th>
              <th className="border p-2 text-left">Âge</th>
              <th className="border p-2 text-left">Branche</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map(member => (
              <tr key={member.id}>
                <td className="border p-2">{member.nom}</td>
                <td className="border p-2">{member.prenom}</td>
                <td className="border p-2">{member.age}</td>
                <td className="border p-2 capitalize">{member.branch}</td>
                <td className="border p-2 space-x-2">
                  <button
                    onClick={() => handleEdit(member)}
                    className="bg-yellow-500 text-white px-2 py-1 rounded text-sm"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ActivitiesManagement = ({ activities, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [formData, setFormData] = useState({
    titre: '', description: '', date_activite: '', branch: '', organ: '', lieu: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const activityData = {
        ...formData,
        date_activite: new Date(formData.date_activite).toISOString(),
        branch: formData.branch || null,
        organ: formData.organ || null
      };
      
      if (editingActivity) {
        await axios.put(`${API}/admin/activities/${editingActivity.id}`, activityData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
      } else {
        await axios.post(`${API}/admin/activities`, activityData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
      }
      
      setFormData({ titre: '', description: '', date_activite: '', branch: '', organ: '', lieu: '' });
      setShowForm(false);
      setEditingActivity(null);
      onUpdate();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleEdit = (activity) => {
    setEditingActivity(activity);
    setFormData({
      titre: activity.titre,
      description: activity.description,
      date_activite: new Date(activity.date_activite).toISOString().split('T')[0],
      branch: activity.branch || '',
      organ: activity.organ || '',
      lieu: activity.lieu || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (activityId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette activité ?')) {
      try {
        await axios.delete(`${API}/admin/activities/${activityId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
        onUpdate();
      } catch (error) {
        console.error('Erreur:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des Activités</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Ajouter une activité
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Titre"
              value={formData.titre}
              onChange={(e) => setFormData({...formData, titre: e.target.value})}
              className="px-3 py-2 border rounded"
              required
            />
            <input
              type="date"
              value={formData.date_activite}
              onChange={(e) => setFormData({...formData, date_activite: e.target.value})}
              className="px-3 py-2 border rounded"
              required
            />
            <select
              value={formData.branch}
              onChange={(e) => setFormData({...formData, branch: e.target.value})}
              className="px-3 py-2 border rounded"
            >
              <option value="">Sélectionner une branche (optionnel)</option>
              <option value="meute">Meute</option>
              <option value="troupe">Troupe</option>
              <option value="compagnie">Compagnie</option>
              <option value="clan">Clan</option>
            </select>
            <input
              type="text"
              placeholder="Lieu (optionnel)"
              value={formData.lieu}
              onChange={(e) => setFormData({...formData, lieu: e.target.value})}
              className="px-3 py-2 border rounded"
            />
          </div>
          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full px-3 py-2 border rounded"
            rows={3}
            required
          />
          <div className="flex space-x-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
              {editingActivity ? 'Modifier' : 'Ajouter'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingActivity(null);
                setFormData({ titre: '', description: '', date_activite: '', branch: '', organ: '', lieu: '' });
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {activities.map(activity => (
          <div key={activity.id} className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-bold text-lg">{activity.titre}</h3>
                <p className="text-gray-600 mt-1">{activity.description}</p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <span>{new Date(activity.date_activite).toLocaleDateString('fr-FR')}</span>
                  {activity.branch && <span className="capitalize">Branche: {activity.branch}</span>}
                  {activity.lieu && <span>Lieu: {activity.lieu}</span>}
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(activity)}
                  className="bg-yellow-500 text-white px-2 py-1 rounded text-sm"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(activity.id)}
                  className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProjectManagement = ({ project, onUpdate }) => {
  const [formData, setFormData] = useState({ titre: '', contenu: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData({ titre: project.titre, contenu: project.contenu });
  }, [project]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(`${API}/admin/project`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      onUpdate();
      alert('Projet pédagogique mis à jour avec succès !');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Gestion du Projet Pédagogique</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-2">Titre du projet</label>
          <input
            type="text"
            value={formData.titre}
            onChange={(e) => setFormData({...formData, titre: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-bold mb-2">Contenu du projet</label>
          <textarea
            value={formData.contenu}
            onChange={(e) => setFormData({...formData, contenu: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg"
            rows={15}
            placeholder="Décrivez votre projet pédagogique ici..."
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Mise à jour...' : 'Mettre à jour le projet'}
        </button>
      </form>
    </div>
  );
};

// Main App
function App() {
  const [view, setView] = useState('public');
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('adminToken'));

  const handleAdminClick = () => {
    setView('login');
  };

  const handleLogin = (token) => {
    localStorage.setItem('adminToken', token);
    setIsAuthenticated(true);
    setView('admin');
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    setView('public');
  };

  return (
    <AuthProvider>
      <div className="App">
        {view === 'public' && <PublicHome onAdminClick={handleAdminClick} />}
        {view === 'login' && <AdminLogin onLogin={handleLogin} />}
        {view === 'admin' && isAuthenticated && (
          <AdminDashboard onLogout={handleLogout} />
        )}
      </div>
    </AuthProvider>
  );
}

export default App;