"use client";

type EmailLogRow = {
  id: string;
  createdAt: string;
  toEmail: string;
  toName: string | null;
  subject: string;
  templateKey: string;
  status: string;
  error: string | null;
};

export function AdminEmailLogTable({ logs }: { logs: EmailLogRow[] }) {
  return (
    <>
      {logs.length === 0 ? (
        <p className="page-lead">No emails sent yet.</p>
      ) : (
        <div className="panel" style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>To</th>
                <th>Subject</th>
                <th>Template</th>
                <th>Status</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                  <td>
                    {log.toName ? `${log.toName} (${log.toEmail})` : log.toEmail}
                  </td>
                  <td>{log.subject}</td>
                  <td>{log.templateKey}</td>
                  <td>
                    <span
                      className={`status-badge${log.status === "sent" ? " status-yes" : " status-no"}`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td>{log.error || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
