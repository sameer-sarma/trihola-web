import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchReferralThread, postThreadMessage, fetchReferralBySlug } from "../services/referralService";
import {
  ReferralDTO,
  ReferralThreadEventDTO,
  MessageMetadata,
  OfferEventMetadata,
  ContactEventMetadata,
  SystemAlertMetadata
} from "../types/referral";
import MessageBubble from "../components/MessageBubble";
import SystemActivity from "../components/SystemActivity";
import MessageInput from "../components/MessageInput";
import { supabase } from "../supabaseClient";
import ReferralActivity from "./ReferralActivity";
import OfferActivity from "./OfferActivity";
import ReferralDetails from "../pages/ReferralDetails";
import { approveClaim } from "../services/offerService";
import ApproveClaimModal from "../components/ApproveClaimModal";
import "../css/Thread.css";
import ReferralFeedPanel from "../components/ReferralFeedPanel";

const formatDay = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

const ReferralThread: React.FC = () => {
  const { slug } = useParams();
  const [events, setEvents] = useState<ReferralThreadEventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [referral, setReferral] = useState<ReferralDTO | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalClaimId, setModalClaimId] = useState<string | null>(null);
  const [modalRedemptionValue, setModalRedemptionValue] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const refreshThread = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const updatedEvents = await fetchReferralThread(slug);
      setEvents(updatedEvents);

      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) { setError("Token not found."); return; }
      setToken(accessToken);

      const referralData = await fetchReferralBySlug(accessToken, slug);
      setReferral(referralData);
    } catch (err) {
      console.error("Failed to refresh thread:", err);
      setError("Failed to load thread");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id || null);
    })();
  }, []);

  useEffect(() => { refreshThread(); }, [refreshThread]);

useEffect(() => {
  if (!slug || !token) return;

  // Build a safe URL and encode the token (JWT contains '.' and '+')
  let url: URL;
  try {
    url = new URL(`/referrals/${slug}/thread/ws`, __WS_BASE__);
  } catch (e) {
    console.error("Invalid __WS_BASE__ for WebSocket:", __WS_BASE__, e);
    return;
  }
  url.searchParams.set("token", token);

  const ws = new WebSocket(url.toString());

  ws.onopen = () => {
    console.log("WebSocket open:", url.toString());
    // Optional: small hello/ping if your server expects it
    // ws.send(JSON.stringify({ type: "PING" }));
  };

  ws.onmessage = (event) => {
    try {
      const newEvent: ReferralThreadEventDTO = JSON.parse(event.data);
      setEvents((prev) => [...prev, newEvent]);
    } catch (err) {
      console.error("Invalid WebSocket message format", err, event.data);
    }
  };

  ws.onclose = (ev) =>
    console.log("WebSocket closed:", ev.code, ev.reason || "(no reason)");
  ws.onerror = (err) => console.error("WebSocket error", err);

  return () => ws.close();
}, [slug, token]);


  // auto-scroll on new events
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [events.length]);

  const handleSendMessage = async (message: string) => {
    if (!slug || !message) return;
    try {
      await postThreadMessage(slug, message);
      await refreshThread();
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const handleApproveClaim = (claimId: string, redemptionValue?: string) => {
    setModalClaimId(claimId);
    setModalRedemptionValue(redemptionValue || "");
    setModalOpen(true);
  };

  const finalizeApproveClaim = async (redemptionValue: string, note?: string) => {
    if (!token || !modalClaimId) return;
    try {
      await approveClaim(modalClaimId, token, redemptionValue, note);
      alert("Claim approved!");
      refreshThread();
    } catch (err: any) {
      console.error(err);
      alert("Error approving claim: " + err.message);
    } finally {
      setModalOpen(false);
      setModalClaimId(null);
      setModalRedemptionValue(null);
    }
  };

    // Group events by day to render separators
  const eventsByDay = useMemo(() => {
    const groups: Record<string, ReferralThreadEventDTO[]> = {};
    for (const e of events) {
      const key = formatDay(e.createdAt);
      (groups[key] ||= []).push(e);
    }
    return groups;
  }, [events]);

  if (loading || !currentUserId) return <p>Loading thread...</p>;
  if (error) return <p>{error}</p>;

  const isInputDisabled = (() => {
    if (!referral || !currentUserId) return true;
    if (referral.status === "CANCELLED") return true;
    if (
      (currentUserId === referral.prospectId && referral.prospectAcceptanceStatus === "REJECTED") ||
      (currentUserId === referral.businessId && referral.businessAcceptanceStatus === "REJECTED")
    ) {
      return true;
    }
    return false;
  })();


return (
  <div className="container">
    <div className="referral-layout">
      {/* LEFT: Referral Details (sticky) */}
      <div className="thread-sidebar">
        {referral ? (
          <ReferralDetails
            referral={referral}
            onThreadUpdate={refreshThread}
            setReferral={setReferral}
          />
        ) : (
          <p className="info-message">Referral not found.</p>
        )}
      </div>

      {/* CENTER: Thread panel with internal scroll + composer */}
      <div className="thread-main">
        <div className="thread-scroll" ref={scrollRef}>
          {Object.entries(eventsByDay).map(([day, list]) => (
            <div key={day}>
              <div className="day-group">{day}</div>

              {list.map((event) => {
                const isMine = event.senderUserId === currentUserId;
                const metadata = event.metadata;

                switch (event.eventType) {
                  case "USER_MESSAGE": {
                    const chat = metadata as MessageMetadata;
                    return (
                      <div className={`event-row ${isMine ? "msg-self" : "msg-other"}`} key={event.id}>
                        <MessageBubble
                          actorName={chat.actorName}
                          message={chat.message}
                          timestamp={event.createdAt}
                          isMine={isMine}
                          attachments={chat.attachmentUrls || []}
                        />
                      </div>
                    );
                  }

                  case "REFERRAL_EVENT":
                    return (
                      <div className="event-row activity-center" key={event.id}>
                        <ReferralActivity
                          slug={slug ?? ""}
                          content={event.content}
                          timestamp={event.createdAt}
                        />
                      </div>
                    );

                  case "OFFER_EVENT": {
                    const offer = metadata as OfferEventMetadata;
                    return (
                      <div className="event-row activity-center" key={event.id}>
                        <OfferActivity
                          timestamp={event.createdAt}
                          actorName={offer.actorName}
                          offerTitle={offer.offerTitle}
                          recipientName={offer.recipientName}
                          eventSubType={offer.eventSubType || "CLAIM"}
                          content={event.content}
                          metadata={event.metadata as OfferEventMetadata}
                          currentUserId={currentUserId}
                          isBusinessOnReferral={referral?.businessId === currentUserId}
                          onApproveClaim={(claimId) => handleApproveClaim(claimId, offer.redemptionValue)}
                        />
                      </div>
                    );
                  }

                  default:
                    return (
                      <div className="event-row msg-system" key={event.id}>
                        <SystemActivity
                          metadata={metadata as ContactEventMetadata | SystemAlertMetadata}
                          timestamp={event.createdAt}
                        />
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
            <MessageInput onSend={handleSendMessage} />
          ) : (
            <p className="info-message">
              Messaging disabled — the referral has been cancelled or you have rejected it.
            </p>
          )}
        </div>
      </div>

      {/* RIGHT: Referral feed panel (sticky & scrollable) */}
      <ReferralFeedPanel />
    </div>

    {/* Modal */}
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
