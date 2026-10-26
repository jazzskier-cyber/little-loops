// One AIWANNA board: "Loops let go", every loop a player has freed. Played outside AIWANNA, the total stays local.
export const LOOPS_LET_GO='loops-let-go-v1';
export const leaderboardConfig={
 origin:'https://www.aiwanna.games',
 origins:['https://www.aiwanna.games','https://aiwanna.games','https://www.ai-made.games','https://ai-made.games','https://1gp-game-platform.vercel.app'],
 gameId:'55b58de0-859d-4db7-8f34-4ca244fc55b3',gameSlug:'81326f2133bcf4097677e223ad0034b0-2686d9c4',
 boards:{[LOOPS_LET_GO]:'01c36590-674f-4dd1-9ca7-8f563f09065f'},
 minScore:1,maxScore:1000000,
};
export const boardDefinition={
 key:LOOPS_LET_GO,name:'Loops let go',
 description:'Every loop you have freed. Each journey level and each day’s fresh tangle counts once. Higher is better.',
 order:'desc',unit:'count',minScore:1,maxScore:1000000,minPlayMs:0,
};
