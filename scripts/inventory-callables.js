const inventory = [
  { name: 'createGameSession', authRequired: true, appCheckRequired: true, roleRequired: 'admin' },
  { name: 'joinGameSession', authRequired: false, appCheckRequired: true, roleRequired: 'none' },
  { name: 'hostAction', authRequired: true, appCheckRequired: true, roleRequired: 'host' },
  { name: 'suspendGame', authRequired: true, appCheckRequired: true, roleRequired: 'host' },
  { name: 'resumeGame', authRequired: true, appCheckRequired: true, roleRequired: 'host' },
  { name: 'rematch', authRequired: true, appCheckRequired: true, roleRequired: 'host' },
  { name: 'generatePackage', authRequired: true, appCheckRequired: true, roleRequired: 'admin' },
  { name: 'finalizePackageUpload', authRequired: true, appCheckRequired: true, roleRequired: 'admin' },
  { name: 'themeMutations', authRequired: true, appCheckRequired: true, roleRequired: 'admin' },
];

console.log('Callable Functions Inventory:');
console.table(inventory);
