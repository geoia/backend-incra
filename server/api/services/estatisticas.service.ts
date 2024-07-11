export async function estatisticas() {
  const meses = [];
  for (let i = 1; i < 13; i++) {
    meses.push({
      area_total: Math.random() * 1000,
      area_queimada: Math.random() * 100,
      num_focos: Math.floor(Math.random() * 100),
    });
  }
  return {
    estatisticas: [
      { ano: 2024, meses: meses },
      { ano: 2023, meses: meses },
      { ano: 2022, meses: meses },
      { ano: 2021, meses: meses },
    ],
  };
}

export default { estatisticas };
