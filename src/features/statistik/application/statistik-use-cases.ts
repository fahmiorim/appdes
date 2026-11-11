import "server-only";

import {
  type StatistikBantuanParams,
  type StatistikBantuanResult,
  type StatistikPendudukParams,
  type StatistikPendudukResult,
} from "@/features/statistik/domain/statistik";
import {
  getStatistikBantuan,
  getStatistikPenduduk,
} from "@/features/statistik/infrastructure/statistik-repository";

export async function getStatistikPendudukUseCase(
  villageId: number,
  params: StatistikPendudukParams,
): Promise<StatistikPendudukResult> {
  return getStatistikPenduduk(villageId, params);
}

export async function getStatistikBantuanUseCase(
  villageId: number,
  params: StatistikBantuanParams,
): Promise<StatistikBantuanResult> {
  return getStatistikBantuan(villageId, params);
}
