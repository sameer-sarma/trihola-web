// src/pages/ReferralThread.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useReferrals } from "../context/ReferralsContext";
import { fetchReferralThread, fetchReferralBySlug, postThreadMessage } from "../services/referralService";
import { approveClaim } from "../services/offerService";
import type { MessageMetadata, OfferEventMetadata, SystemAlertMetadata, ReferralDTO, ReferralThreadEventDTO, ReferralUpdatedMsg } from "../types/referral";
import ReferralDetails from "../pages/ReferralDetails";
import MessageBubble from "../components/MessageBubble";
import ReferralFeedPanel from "../components/ReferralFeedPanel";
import ReferralActivity from "./ReferralActivity";
import OfferActivity from "./OfferActivity";
import SystemActivity from "../components/SystemActivity";
import ApproveClaimModal from "../components/ApproveClaimModal";
import "../css/Thread.css";

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

const ReferralThread: React.FC = () => {
  const { slug } = useParams();
  const { updateOne: updateFeedItem } = useReferrals();

  const [events, setEvents] = useState<ReferralThreadEventDTO[]>([]);
  const [referral, setReferral] = useState<ReferralDTO | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalClaimId, setModalClaimId] = useState<string | null>(null);
  const [modalRedemptionValue, setModalRedemptionValue] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // 0) session
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id || null);
      setToken(session?.access_token || null);
    })();
  }, []);

  // 1) initial load: events + enriched referral
  const initialLoad = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const thread = await fetchReferralThread(slug);
      const { data: { session } } = await supabase.auth.getSession();
      const t = session?.access_token;
      if (!t) return;
      const ref = await fetchReferralBySlug(t, slug);
      setEvents(thread);
      setReferral(ref);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { void initialLoad(); }, [initialLoad]);

  // 2) WebSocket: handle timeline events + REFERRAL_UPDATED side-panel updates
  useEffect(() => {
    if (!slug || !token) return;

    let url: URL;
    try {
      url = new URL(`/referrals/${slug}/thread/ws`, __WS_BASE__);
    } catch {
      console.error("Invalid __WS_BASE__:", __WS_BASE__);
      return;
    }
    url.searchParams.set("token", token);
    const ws = new WebSocket(url.toString());

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg?.type === "REFERRAL_UPDATED") {
          const upd = msg as ReferralUpdatedMsg;
          setReferral(upd.referral);         // 🔥 no refetch
          updateFeedItem(upd.referral);      // keep right-hand list in sync
          return;
        }
        // else treat as normal timeline event
        setEvents(prev => [...prev, msg as ReferralThreadEventDTO]);
      } catch (err) {
        console.error("WS parse error", err, e.data);
      }
    };

    return () => ws.close();
  }, [slug, token, updateFeedItem]);

  // 3) autoscroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [events.length]);

  // actions
  const handleSendMessage = async (message: string) => {
    if (!slug || !message) return;
    await postThreadMessage(slug, message);
    // rely on WS echo to append; if your server doesn't echo, you can optimistically append here
  };

  const handleApproveClaim = (claimId: string, redemptionValue?: string) => {
    setModalClaimId(claimId);
    setModalRedemptionValue(redemptionValue || "");
    setModalOpen(true);
  };

  const finalizeApproveClaim = async (redemptionValue: string, note?: string) => {
    if (!token || !modalClaimId) return;
    await approveClaim(modalClaimId, token, redemptionValue, note);
    setModalOpen(false);
    setModalClaimId(null);
    setModalRedemptionValue(null);
    // no refetch — server will emit REFERRAL_UPDATED + OFFER_EVENT
  };

  const isInputDisabled = (() => {
    if (!referral || !currentUserId) return true;
    if (referral.status === "CANCELLED") return true;
    // add rejection checks if you keep them on DTO
    return false;
  })();

  // group by day
  const eventsByDay = useMemo(() => {
    const groups: Record<string, ReferralThreadEventDTO[]> = {};
    for (const e of events) {
      const key = formatDay(e.createdAt);
      (groups[key] ||= []).push(e);
    }
    return groups;
  }, [events]);

  if (loading || !currentUserId) return <p>Loading thread...</p>;

  return (
    <div className="container">
      <div className="referral-layout">
        <div className="thread-sidebar">
          {referral ? (
            <ReferralDetails referral={referral} setReferral={setReferral} />
          ) : (
            <p className="info-message">Referral not found.</p>
          )}
        </div>

        <div className="thread-main">
          <div className="thread-scroll">
            {Object.entries(eventsByDay).map(([day, list]) => (
              <div key={day}>
                <div className="day-group">{day}</div>
                {list.map((event) => {
                  const isMine = event.senderUserId === currentUserId;
                  switch (event.eventType) {
                    case "USER_MESSAGE":
                      return (
                        <div className={`event-row ${isMine ? "msg-self" : "msg-other"}`} key={event.id}>
                          <MessageBubble
                            actorName={(event.metadata as MessageMetadata)?.actorName}
                            message={(event.metadata as MessageMetadata)?.message}
                            timestamp={event.createdAt}
                            isMine={isMine}
                            attachments={(event.metadata as MessageMetadata)?.attachmentUrls || []}
                          />
                        </div>
                      );
                    case "REFERRAL_EVENT":
                      return (
                        <div className="event-row activity-center" key={event.id}>
                          <ReferralActivity slug={slug ?? ""} content={event.content} timestamp={event.createdAt} />
                        </div>
                      );
                    case "OFFER_EVENT":
                      return (
                        <div className="event-row activity-center" key={event.id}>
                          <OfferActivity
                            timestamp={event.createdAt}
                            actorName={(event.metadata as OfferEventMetadata)?.actorName}
                            offerTitle={(event.metadata as OfferEventMetadata)?.offerTitle}
                            recipientName={(event.metadata as OfferEventMetadata)?.recipientName}
                            eventSubType={(event.metadata as OfferEventMetadata)?.eventSubType || "CLAIM"}
                            content={event.content}
                            metadata={event.metadata as OfferEventMetadata}
                            currentUserId={currentUserId}
                            isBusinessOnReferral={referral?.businessId === currentUserId}
                            onApproveClaim={(claimId) => handleApproveClaim(claimId, (event.metadata as OfferEventMetadata)?.redemptionValue)}
                          />
                        </div>
                      );
                    default:
                      return (
                        <div className="event-row msg-system" key={event.id}>
                          <SystemActivity metadata={event.metadata as SystemAlertMetadata} timestamp={event.createdAt} />
                        </div>
                      );
                  }
                })}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="composer-wrap">
            {!isInputDisabled ? (
              <div style={{ padding: "8px" }}>
                <textarea
                  placeholder="Type your message…"
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      const val = (e.target as HTMLTextAreaElement).value.trim();
                      if (val) {
                        await handleSendMessage(val);
                        (e.target as HTMLTextAreaElement).value = "";
                      }
                    }
                  }}
                  style={{ width: "100%", minHeight: 64 }}
                />
              </div>
            ) : (
              <p className="info-message">Messaging disabled — this referral is inactive.</p>
            )}
          </div>
        </div>

   {/* Right column: feed panel */}
        <div className="thread-aside">
          <ReferralFeedPanel />
        </div>
      </div>

      <ApproveClaimModal
        isOpen={modalOpen}
        defaultValue={modalRedemptionValue ?? ""}
        onClose={() => setModalOpen(false)}
        onApprove={finalizeApproveClaim}
      />
    </div>
  );
};

export default ReferralThread;
