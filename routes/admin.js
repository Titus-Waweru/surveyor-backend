import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/dashboard/Layout.jsx";

export default function AdminDashboard({ user, setUser }) {
  const [bookings, setBookings] = useState([]);
  const [surveyors, setSurveyors] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("bookings");

  const API_BASE = import.meta.env.VITE_API_URL;

  const handleLogout = () => setUser(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const bookingsRes = await axios.get(`${API_BASE}/bookings/all`);
        const usersRes = await axios.get(`${API_BASE}/users/surveyors`);
        const adminsRes = await axios.get(`${API_BASE}/admins/all`); // ✅ CORRECTED ENDPOINT
        setBookings(bookingsRes.data);
        setSurveyors(usersRes.data);
        setAdmins(adminsRes.data);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch data.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [API_BASE]);

  const handleAssign = async (bookingId, surveyorId) => {
    try {
      await axios.patch(`${API_BASE}/bookings/${bookingId}/assign`, {
        surveyorId,
      });
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, assignedSurveyorId: surveyorId } : b
        )
      );
    } catch (err) {
      console.error(err);
      alert("Failed to assign surveyor.");
    }
  };

  return (
    <Layout user={user} onLogout={handleLogout}>
      <h1 className="text-2xl font-bold mb-6 font-poppins">Admin Dashboard</h1>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "bookings"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("bookings")}
        >
          Bookings ({bookings.length})
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "admins"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("admins")}
        >
          Admins ({admins.length})
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "surveyors"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("surveyors")}
        >
          Surveyors ({surveyors.length})
        </button>
      </div>

      {loading ? (
        <p className="text-gray-600 font-manrope">Loading data...</p>
      ) : error ? (
        <p className="text-red-600 font-manrope">{error}</p>
      ) : (
        <>
          {/* Bookings Tab */}
          {activeTab === "bookings" && (
            <div className="grid gap-4 font-manrope">
              {bookings.length === 0 ? (
                <p className="text-gray-600">No bookings found.</p>
              ) : (
                bookings.map((b) => (
                  <div key={b.id} className="bg-white border p-4 rounded shadow">
                    <h3 className="font-semibold">
                      {b.surveyType} at {b.location}
                    </h3>
                    <p className="text-sm text-gray-600">{b.description}</p>
                    
                    {b.county && (
                      <p className="text-sm mt-1">
                        <span className="font-semibold">County:</span> {b.county} County
                      </p>
                    )}
                    
                    <p className="text-sm mt-1">Status: {b.status}</p>
                    <p className="text-sm">Client: {b.user?.email}</p>
                    
                    {b.latitude && b.longitude && (
                      <p className="text-xs text-gray-500 mt-1">
                        Coordinates: {b.latitude?.toFixed(4)}, {b.longitude?.toFixed(4)}
                      </p>
                    )}
                    
                    <div className="mt-3">
                      <label className="mr-2 text-sm">Assign Surveyor:</label>
                      <select
                        className="border rounded px-2 py-1"
                        value={b.assignedSurveyorId || ""}
                        onChange={(e) => handleAssign(b.id, parseInt(e.target.value))}
                      >
                        <option value="">-- Select --</option>
                        {surveyors.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Admins Tab */}
          {activeTab === "admins" && (
            <div className="bg-white border rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Registered Administrators</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Total {admins.length} admin{admins.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="divide-y">
                {admins.length === 0 ? (
                  <p className="p-4 text-gray-600">No administrators found.</p>
                ) : (
                  admins.map((admin) => (
                    <div key={admin.id} className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          {admin.profileImageUrl ? (
                            <img 
                              src={admin.profileImageUrl} 
                              alt={admin.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {admin.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold">{admin.name}</h3>
                            <p className="text-sm text-gray-600">{admin.email}</p>
                            {admin.phoneNumber && (
                              <p className="text-xs text-gray-500">Phone: {admin.phoneNumber}</p>
                            )}
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Admin
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Surveyors Tab */}
          {activeTab === "surveyors" && (
            <div className="bg-white border rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Registered Surveyors</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Total {surveyors.length} surveyor{surveyors.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="divide-y">
                {surveyors.length === 0 ? (
                  <p className="p-4 text-gray-600">No surveyors found.</p>
                ) : (
                  surveyors.map((surveyor) => (
                    <div key={surveyor.id} className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold">{surveyor.name}</h3>
                          <p className="text-sm text-gray-600">{surveyor.email}</p>
                          <p className="text-xs text-gray-500">
                            Status: <span className={`${surveyor.status === 'approved' ? 'text-green-600' : 'text-yellow-600'}`}>
                              {surveyor.status}
                            </span>
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          surveyor.status === 'approved' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {surveyor.status === 'approved' ? 'Approved' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}