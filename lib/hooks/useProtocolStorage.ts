import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DosingProtocol, FrequencyType, ConcentrationUnit, ProtocolSchedule, NextDose, CalculatedDose, FREQUENCY_CONFIG } from '../../types/protocol';
import { useAuth } from '../../contexts/AuthContext';

const PROTOCOL_STORAGE_KEY = 'dosingProtocols';

export function useProtocolStorage() {
  const { user } = useAuth();
  const [protocols, setProtocols] = useState<DosingProtocol[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load protocols from storage
  const loadProtocols = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const stored = await AsyncStorage.getItem(PROTOCOL_STORAGE_KEY);
      if (stored) {
        const parsedProtocols: DosingProtocol[] = JSON.parse(stored);
        // Filter by user if authenticated, otherwise show all
        const userProtocols = user 
          ? parsedProtocols.filter(p => p.userId === user.uid || !p.userId)
          : parsedProtocols.filter(p => !p.userId);
        setProtocols(userProtocols);
      }
    } catch (err) {
      console.error('[ProtocolStorage] Error loading protocols:', err);
      setError('Failed to load protocols');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Save protocols to storage
  const saveProtocols = useCallback(async (protocolsToSave: DosingProtocol[]) => {
    try {
      await AsyncStorage.setItem(PROTOCOL_STORAGE_KEY, JSON.stringify(protocolsToSave));
      setProtocols(protocolsToSave);
    } catch (err) {
      console.error('[ProtocolStorage] Error saving protocols:', err);
      throw new Error('Failed to save protocols');
    }
  }, []);

  // Calculate dose amounts based on weekly target and frequency
  const calculateDoseAmounts = useCallback((
    weeklyTarget: number,
    frequency: FrequencyType,
    concentration: number,
    concentrationUnit: ConcentrationUnit
  ): CalculatedDose => {
    const config = FREQUENCY_CONFIG[frequency];
    const amountPerDose = weeklyTarget / config.dosesPerWeek;
    
    // Calculate volume based on concentration
    // Assuming concentration is in format like "300 mg/mL" -> 300 mg per 1 mL
    const volumePerDose = amountPerDose / concentration; // in mL
    
    // Determine appropriate syringe type based on volume
    let syringeType: '1mL' | '3mL' | '5mL' | '10mL' = '1mL';
    if (volumePerDose > 5) syringeType = '10mL';
    else if (volumePerDose > 3) syringeType = '5mL';
    else if (volumePerDose > 1) syringeType = '3mL';
    
    // Calculate syringe units (assuming 100 units per mL for insulin syringes, direct mL for standard)
    const syringeUnits = syringeType === '1mL' ? volumePerDose * 100 : volumePerDose;

    return {
      amountPerDose,
      volumePerDose,
      syringeUnits,
      syringeType
    };
  }, []);

  // Generate schedule based on start date/time and frequency
  const generateSchedule = useCallback((
    startDate: string,
    startTime: string,
    frequency: FrequencyType
  ): ProtocolSchedule[] => {
    const config = FREQUENCY_CONFIG[frequency];
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const schedule: ProtocolSchedule[] = [];

    if (frequency === 'daily') {
      // Daily: same time every day
      for (let i = 0; i < 7; i++) {
        schedule.push({
          id: `daily-${i}`,
          dayOfWeek: i,
          time: startTime,
          doseAmount: 0, // Will be calculated later
          unit: 'mg' // Default unit
        });
      }
    } else {
      const dosesPerWeek = config.dosesPerWeek;
      const daysBetween = config.daysBetween;
      
      for (let i = 0; i < dosesPerWeek; i++) {
        const doseDate = new Date(startDateTime);
        doseDate.setDate(doseDate.getDate() + (i * daysBetween));
        
        schedule.push({
          id: `dose-${i}`,
          dayOfWeek: doseDate.getDay(),
          time: startTime,
          doseAmount: 0, // Will be calculated later
          unit: 'mg' // Default unit
        });
      }
    }

    return schedule;
  }, []);

  // Create a new protocol
  const createProtocol = useCallback(async (protocolData: {
    compoundName: string;
    concentration: number;
    concentrationUnit: ConcentrationUnit;
    weeklyTargetDose: number;
    weeklyTargetUnit: string;
    frequency: FrequencyType;
    startDate: string;
    startTime: string;
  }) => {
    try {
      setError(null);
      
      const id = `protocol-${Date.now()}`;
      const schedule = generateSchedule(protocolData.startDate, protocolData.startTime, protocolData.frequency);
      const calculatedDose = calculateDoseAmounts(
        protocolData.weeklyTargetDose,
        protocolData.frequency,
        protocolData.concentration,
        protocolData.concentrationUnit
      );

      // Update schedule with calculated dose amounts
      const updatedSchedule = schedule.map(s => ({
        ...s,
        doseAmount: calculatedDose.amountPerDose,
        unit: protocolData.weeklyTargetUnit
      }));

      const newProtocol: DosingProtocol = {
        id,
        ...protocolData,
        schedule: updatedSchedule,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: user?.uid
      };

      const existingProtocols = await AsyncStorage.getItem(PROTOCOL_STORAGE_KEY);
      const allProtocols: DosingProtocol[] = existingProtocols ? JSON.parse(existingProtocols) : [];
      const updatedProtocols = [...allProtocols, newProtocol];
      
      await saveProtocols(updatedProtocols);
      return newProtocol;
    } catch (err) {
      console.error('[ProtocolStorage] Error creating protocol:', err);
      setError('Failed to create protocol');
      throw err;
    }
  }, [user, generateSchedule, calculateDoseAmounts, saveProtocols]);

  // Get next doses for active protocols
  const getNextDoses = useCallback((): NextDose[] => {
    const now = new Date();
    const nextDoses: NextDose[] = [];

    protocols.forEach(protocol => {
      if (!protocol.isActive) return;

      const calculatedDose = calculateDoseAmounts(
        protocol.weeklyTargetDose,
        protocol.frequency,
        protocol.concentration,
        protocol.concentrationUnit
      );

      protocol.schedule.forEach(scheduleItem => {
        // Calculate next occurrence of this scheduled dose
        const nextDate = new Date();
        const currentDay = nextDate.getDay();
        const targetDay = scheduleItem.dayOfWeek;
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        
        nextDate.setDate(nextDate.getDate() + daysUntilTarget);
        const [hours, minutes] = scheduleItem.time.split(':').map(Number);
        nextDate.setHours(hours, minutes, 0, 0);

        // If it's today but time has passed, move to next week
        if (daysUntilTarget === 0 && nextDate <= now) {
          nextDate.setDate(nextDate.getDate() + 7);
        }

        nextDoses.push({
          scheduleId: scheduleItem.id,
          nextDateTime: nextDate.toISOString(),
          doseInfo: calculatedDose,
          compoundName: protocol.compoundName
        });
      });
    });

    // Sort by next dose time
    return nextDoses.sort((a, b) => 
      new Date(a.nextDateTime).getTime() - new Date(b.nextDateTime).getTime()
    );
  }, [protocols, calculateDoseAmounts]);

  // Get active protocol (assuming only one for now)
  const getActiveProtocol = useCallback((): DosingProtocol | null => {
    return protocols.find(p => p.isActive) || null;
  }, [protocols]);

  // Load protocols on mount
  useEffect(() => {
    loadProtocols();
  }, [loadProtocols]);

  return {
    protocols,
    isLoading,
    error,
    createProtocol,
    getNextDoses,
    getActiveProtocol,
    calculateDoseAmounts,
    loadProtocols
  };
}