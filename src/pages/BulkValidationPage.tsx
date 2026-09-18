import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader.js';
import { ValidationTable, ValidationItem } from '../components/common/ValidationTable.js';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';

export const BulkValidationPage: React.FC = () => {
  const { showToast } = useAuth();
  const [items, setItems] = useState<ValidationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchIntegrityData = async () => {
    try {
      setIsLoading(true);
      const [resRes, marksRes] = await Promise.all([
        api.get('/resources'),
        api.get('/examinations/marks'),
      ]);

      const combined: ValidationItem[] = [];
      let row = 1;

      if (resRes.data.success) {
        resRes.data.data.forEach((r: any) => {
          combined.push({
            id: r.id,
            rowNumber: row++,
            identifier: `RES:${r.courseCode}`,
            title: r.title,
            secondaryInfo: `Category: ${r.category} • Size: ${r.fileSize} • URL: ${r.driveUrl.substring(0, 32)}...`,
            status: r.status,
            errorDetails: r.errorDetails,
          });
        });
      }

      if (marksRes.data.success) {
        marksRes.data.data.forEach((m: any) => {
          combined.push({
            id: m.id,
            rowNumber: row++,
            identifier: `MARK:${m.rollNo}`,
            title: `${m.studentName} (Course CS601)`,
            secondaryInfo: `Theory: ${m.theoryMarks}/${m.maxTheory}, Internal: ${m.internalMarks}/${m.maxInternal}, Total: ${m.totalMarks}`,
            status: m.status,
            errorDetails: m.validationMessage,
          });
        });
      }

      setItems(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrityData();
  }, []);

  const handleExcludeDeficiencies = async () => {
    try {
      setIsLoading(true);
      await api.post('/resources/exclude-deficiencies');
      showToast('success', 'Deficiencies Isolated', 'Isolated out-of-bounds items from production pipelines.');
      await fetchIntegrityData();
    } catch (err: any) {
      showToast('error', 'Failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Pre-Flight Validation Engine"
        badgeIcon="rule"
        title="Cross-Dataset Pre-Flight Schema Audit"
        description="Unified pre-flight ledger auditing staged academic resources, student marks, and admission datasets against institutional schema rules prior to ACID commit."
        actions={
          <button
            onClick={fetchIntegrityData}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Re-scan Workbooks</span>
          </button>
        }
      />

      <ValidationTable
        items={items}
        onExcludeDeficiencies={handleExcludeDeficiencies}
        title="Institutional Pre-Flight Audit Ledger"
        subtitle="Automated real-time integrity verification across all staging schemas"
      />
    </div>
  );
};
