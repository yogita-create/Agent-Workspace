import { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";

export function useOrganizationRole() {
  const [role, setRole] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const fetchRole = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get("/api/organizations/me");
        if (response.data?.success && response.data?.organizations?.length > 0) {
          const firstOrg = response.data.organizations[0];
          if (!ignore) {
            setRole(firstOrg.role);
            setOrganizationId(firstOrg._id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch organization role:", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchRole();

    return () => {
      ignore = true;
    };
  }, []);

  return { role, organizationId, loading };
}

export default useOrganizationRole;
