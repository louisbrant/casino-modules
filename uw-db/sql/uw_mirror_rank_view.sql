CREATE OR REPLACE VIEW uw_user_mirror_combat_view AS (
SELECT
		u.id userId,
		sum(h.combatEff) combatEff
	FROM
		uw_user u, uw_hero h
	WHERE
	h.userId = u.id and h.posMirrorD is not null
	GROUP BY u.id
);

CREATE OR REPLACE VIEW uw_mirror_rank_view AS (
SELECT
		r.*, 
		u. name,
		u.lvl,
		u.iconId,
		umc_view.combatEff combatEff,
		0 isLocked,
		0 totalGain
	FROM
		uw_mirror_rank r, uw_user u, uw_user_mirror_combat_view umc_view
	WHERE
	r.userId = u.id and umc_view.userId = u.id);