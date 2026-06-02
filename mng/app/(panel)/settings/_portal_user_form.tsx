"use client";
import { useState } from "react";

interface Customer { id: number; company_name: string; }
interface Employee { id: number; first_name: string; last_name: string; email: string; customer_id: number; }
interface Group { id: number; name: string; }

interface Props {
  customers: Customer[];
  employees: Employee[];
  groups: Group[];
  addPortalUser: (fd: FormData) => Promise<void>;
}

export function PortalUserForm({ customers, employees, groups, addPortalUser }: Props) {
  const [custId, setCustId] = useState("");
  const [empId, setEmpId] = useState("");

  const filteredEmployees = employees.filter((e) => e.customer_id === Number(custId));

  // Auto-fill name/email from selected employee
  const selectedEmp = employees.find((e) => e.id === Number(empId));

  function handleCustChange(v: string) {
    setCustId(v);
    setEmpId("");
  }

  function handleEmpChange(v: string) {
    setEmpId(v);
  }

  return (
    <form action={addPortalUser} className="form-inner">
      <div className="grid2-inner">
        <div className="field">
          <label>Ad Soyad *</label>
          <input
            name="full_name"
            type="text"
            required
            value={selectedEmp ? `${selectedEmp.first_name} ${selectedEmp.last_name}` : undefined}
            defaultValue=""
            key={empId + "-name"}
          />
        </div>
        <div className="field">
          <label>E-posta *</label>
          <input
            name="email"
            type="email"
            required
            value={selectedEmp?.email ?? undefined}
            defaultValue=""
            key={empId + "-email"}
          />
        </div>
        <div className="field">
          <label>Firma *</label>
          <select name="customer_id" required value={custId} onChange={(e) => handleCustChange(e.target.value)}>
            <option value="">— Seçin —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Çalışan (opsiyonel)</label>
          <select name="employee_id" value={empId} onChange={(e) => handleEmpChange(e.target.value)} disabled={!custId}>
            <option value="">— Bağlamak için seçin —</option>
            {filteredEmployees.map((e) => (
              <option key={e.id} value={e.id}>{e.first_name} {e.last_name}{e.email ? ` (${e.email})` : ""}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Yetki Grubu *</label>
          <select name="permission_group_id" required>
            <option value="">— Seçin —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>
      {custId && filteredEmployees.length === 0 && (
        <p style={{ fontSize: 12, color: "#f59e0b", margin: "0" }}>
          Bu firmanın kayıtlı çalışanı yok — İsim ve e-postayı manuel girebilirsiniz.
        </p>
      )}
      <button type="submit" className="btn-save">Oluştur &amp; Davet Gönder</button>
    </form>
  );
}
