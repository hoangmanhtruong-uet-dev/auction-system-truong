import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    auction_reads: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: Number(__ENV.READ_VUS || 10) },
        { duration: "2m", target: Number(__ENV.READ_VUS || 10) },
        { duration: "30s", target: 0 },
      ],
      exec: "auctionReads",
    },
    readiness: {
      executor: "constant-arrival-rate",
      rate: Number(__ENV.READINESS_RPS || 2),
      timeUnit: "1s",
      duration: "3m",
      preAllocatedVUs: 2,
      exec: "readiness",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{scenario:readiness}": ["p(95)<250"],
    "http_req_duration{scenario:auction_reads}": ["p(95)<750"],
  },
};

const baseUrl = (__ENV.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

export function auctionReads() {
  const response = http.get(`${baseUrl}/auctions`);
  check(response, { "auction list returns 200": (result) => result.status === 200 });
  sleep(0.2);
}

export function readiness() {
  const response = http.get(`${baseUrl}/api/health/ready`);
  check(response, { "readiness returns 200": (result) => result.status === 200 });
}
