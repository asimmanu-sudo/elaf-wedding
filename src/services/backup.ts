
import { today } from '../utils/helpers';

export const backupService = {
  /**
   * Exports data to a JSON file with a fixed name and records the action date.
   */
  exportData: (allData: Record<string, any>) => {
    try {
      const jsonString = JSON.stringify(allData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = url;
      // Fixed name as requested to easily replace old files
      link.download = 'elaf_wedding_backup.json'; 
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Record successful backup date
      localStorage.setItem('last_backup_date', today);
      return true;
    } catch (e) {
      console.error("Backup export failed", e);
      return false;
    }
  },

  /**
   * Checks if a backup has been performed today.
   * Returns true if backup is needed (i.e., last date != today).
   */
  isBackupNeeded: () => {
    const lastDate = localStorage.getItem('last_backup_date');
    return lastDate !== today;
  }
};
