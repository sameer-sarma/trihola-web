// src/pages/MyInvitesPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listMyAffiliateInvites,
  acceptInvite,
  declineInvite,
} from '../api/campaigninvitesapi';
import type { CampaignHubAffiliating } from '../types/campaign';

type MyInvitesPageProps = {
  token: string;
};

const MyInvitesPage: React.FC<MyInvitesPageProps> = ({ token }) => {
  const navigate = useNavigate();

  const [invites, setInvites] = useState<CampaignHubAffiliating[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    
    if (!token) {
      setErrorMsg('You must be logged in to view your invites.');
      setLoading(false);
      return;
    }

  setLoading(true);
  setErrorMsg(null);
  try {
    const data = await listMyAffiliateInvites(token);
    setInvites(data);
  } catch (e: any) {
    setErrorMsg(e.message || 'Failed to load invites');
  } finally {
    setLoading(false);
  }
}, [token]);

useEffect(() => {
  void loadInvites();
}, [loadInvites]);

/*  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!token) {
        setErrorMsg('You must be logged in to view your invites.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      try {
        const data = await listMyAffiliateInvites(token);
        if (!cancelled) {
          setInvites(data);
        }
      } catch (e: any) {
        if (!cancelled) {
          console.error(e);
          setErrorMsg(e.message || 'Failed to load invites');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);
*/
  const handleOpenThread = (inv: CampaignHubAffiliating) => {
    navigate(`/campaigns/${inv.campaignId}/invites/${inv.inviteId}/thread`);
  };

  const handleAccept = async (inv: CampaignHubAffiliating) => {
    setActionError(null);
    setBusyInviteId(inv.inviteId);
    try {
      await acceptInvite(inv.inviteId, token);
      await loadInvites();   
    } catch (e: any) {
      console.error(e);
      setActionError(e.message || 'Failed to accept invite');
    } finally {
      setBusyInviteId(null);
    }
  };

  const handleDecline = async (inv: CampaignHubAffiliating) => {
    setActionError(null);
    setBusyInviteId(inv.inviteId);
    try {
      await declineInvite(inv.inviteId, token);
/*     
 setInvites(prev =>
        prev.map(x =>
          x.inviteId === inv.inviteId ? { ...x, status: 'DECLINED' } : x
        )
      );
*/
      await loadInvites();   

    } catch (e: any) {
      console.error(e);
      setActionError(e.message || 'Failed to decline invite');
    } finally {
      setBusyInviteId(null);
    }
  };

  return (
    <div className="page my-invites-page">
      <div className="page-header">
        <h1>My Campaign Invites</h1>
        <p className="page-subtitle">
          All campaigns you’ve been invited to refer for.
        </p>
      </div>

      {loading && <p>Loading invites…</p>}

      {errorMsg && !loading && (
        <div className="error-message">
          <p>{errorMsg}</p>
        </div>
      )}

      {actionError && (
        <div className="error-message">
          <p>{actionError}</p>
        </div>
      )}

      {!loading && !errorMsg && invites.length === 0 && (
        <p>You don’t have any invites yet.</p>
      )}

      {!loading && !errorMsg && invites.length > 0 && (
        <>
          <div className="section-hd">
            <h3 className="section-title">Campaigns I’m invited to refer</h3>
          </div>

          <div className="list-stack">
            {invites.map(i => (
              <div
                key={`${i.campaignId}:${i.inviteId}`}
                className="invite-row"
              >
                <div className="invite-row__body">
                  <div className="invite-row__line1">
                    <span className="title">{i.campaignTitle}</span>
                    {i.status && (
                      <span className={`pill pill--${pillClass(i.status)}`}>
                        {i.status.toLowerCase()}
                      </span>
                    )}
                  </div>

                  <div className="invite-row__rewards">
                    {i.rewardReferrer && (
                      <RewardChip label="Referrer" value={i.rewardReferrer} />
                    )}
                    {i.rewardProspect && (
                      <RewardChip label="Prospect" value={i.rewardProspect} />
                    )}
                    {i.invitedBy && (
                      <span className="muted">
                        Invited by {i.invitedBy}
                      </span>
                    )}
                  </div>
                </div>

                <div className="invite-row__actions">
                  {i.status === 'INVITED' && (
                    <>
                      <button
                        className="btn btn--sm btn--primary"
                        disabled={busyInviteId === i.inviteId}
                        onClick={() => handleAccept(i)}
                      >
                        {busyInviteId === i.inviteId ? 'Accepting…' : 'Accept'}
                      </button>
                      <button
                        className="btn btn--sm btn--ghost"
                        disabled={busyInviteId === i.inviteId}
                        onClick={() => handleDecline(i)}
                      >
                        {busyInviteId === i.inviteId ? 'Declining…' : 'Decline'}
                      </button>
                    </>
                  )}

                  <button
                    className="btn btn--sm btn--ghost"
                    onClick={() => handleOpenThread(i)}
                  >
                    Open Thread
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default MyInvitesPage;

// Same helpers as in CampaignHubPage, so the styling matches
function RewardChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="reward-chip">
      <b>{label}:</b> {value}
    </span>
  );
}

function pillClass(s: string) {
  switch (s) {
    case 'ACCEPTED':
      return 'accepted';
    case 'DECLINED':
      return 'declined';
    case 'VIEWED':
      return 'viewed';
    case 'INVITED':
      return 'invited';
    case 'EXPIRED':
      return 'expired';
    default:
      return '';
  }
}
