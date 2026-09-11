export const Data1  = {
    "quantum Computing": {
        "umap_values": [
            {
                "text": "A quantum computer is a computer that exploits quantum mechanical phenomena. On small scales, physical matter exhibits properties of both particles and waves, and quantum computing leverages this behavior using specialized hardware. Classical physics cannot explain the operation of these quantum devices, and a scalable quantum computer could perform some calculations exponentially faster[a] than any modern 'classical' computer. Theoretically a large-scale quantum computer could break some widely used encryption schemes and aid physicists in performing physical simulations; however, the current state of the art is largely experimental and impractical, with several obstacles to useful applications.",
                "umap_x": 0.6409709453582764,
                "umap_y": 1.0979664325714111,
                "color": "#FF7F0E"
            },
            {
                "text": "The basic unit of information in quantum computing, the qubit (or 'quantum bit'), serves the same function as the bit in classical computing. However, unlike a classical bit, which can be in one of two states (a binary), a qubit can exist in a superposition of its two 'basis' states, a state that is in an abstract sense 'between' the two basis states. When measuring a qubit, the result is a probabilistic output of a classical bit. If a quantum computer manipulates the qubit in a particular way, wave interference effects can amplify the desired measurement results. The design of quantum algorithms involves creating procedures that allow a quantum computer to perform calculations efficiently and quickly.",
                "umap_x": -0.3817142844200134,
                "umap_y": 1.4159948825836182,
                "color": "#FF7F0E"
            },
            {
                "text": "Quantum computers are not yet practical for real work. Physically engineering high-quality qubits has proven challenging. If a physical qubit is not sufficiently isolated from its environment, it suffers from quantum decoherence, introducing noise into calculations. National governments have invested heavily in experimental research that aims to develop scalable qubits with longer coherence times and lower error rates. Example implementations include superconductors (which isolate an electrical current by eliminating electrical resistance) and ion traps (which confine a single atomic particle using electromagnetic fields).",
                "umap_x": 0.473326712846756,
                "umap_y": 0.42183440923690796,
                "color": "#FF7F0E"
            },
            {
                "text": "In principle, a classical computer can solve the same computational problems as a quantum computer, given enough time. Quantum advantage comes in the form of time complexity rather than computability,and quantum complexity theory shows that some quantum algorithms are exponentially more efficient than the best-known classical algorithms. A large-scale quantum computer could in theory solve computational problems unsolvable by a classical computer in any reasonable amount of time. This concept of extra ability has been called 'quantum supremacy'. While such claims have drawn significant attention to the discipline, near-term practical use cases remain limited",
                "umap_x": 0.7294812798500061,
                "umap_y": 1.7135294675827026,
                "color": "#FF7F0E"
            }
        ],
        "color": "#FF7F0E",
        "length": 4
    },
    "History": {
        "umap_values": [
            {
                "text": "For many years, the fields of quantum mechanics and computer science formed distinct academic communities.[1] Modern quantum theory developed in the 1920s to explain perplexing physical phenomena observed at atomic scales,[2][3] and digital computers emerged in the following decades to replace human computers for tedious calculations.[4] Both disciplines had practical applications during World War II; computers played a major role in wartime cryptography,[5] and quantum physics was essential for nuclear physics used in the Manhattan Project.[6]",
                "umap_x": 1.4099713563919067,
                "umap_y": 1.0305932760238647,
                "color": "#0D9494"
            },
            {
                "text": "As physicists applied quantum mechanical models to computational problems and swapped digital bits for qubits, the fields of quantum mechanics and computer science began to converge. In 1980, Paul Benioff introduced the quantum Turing machine, which uses quantum theory to describe a simplified computer.[7] When digital computers became faster, physicists faced an exponential increase in overhead when simulating quantum dynamics,[8] prompting Yuri Manin and Richard Feynman to independently suggest that hardware based on quantum phenomena might be more efficient for computer simulation.[9][10][11] In a 1984 paper, Charles Bennett and Gilles Brassard applied quantum theory to cryptography protocols and demonstrated that quantum key distribution could enhance information security.[12][13]",
                "umap_x": 0.995061993598938,
                "umap_y": 1.367984414100647,
                "color": "#0D9494"
            },
            {
                "text": "Quantum algorithms then emerged for solving oracle problems, such as Deutsch's algorithm in 1985,[14] the Bernstein–Vazirani algorithm in 1993,[15] and Simon's algorithm in 1994.[16] These algorithms did not solve practical problems, but demonstrated mathematically that one could gain more information by querying a black box with a quantum state in superposition, sometimes referred to as quantum parallelism.[17]",
                "umap_x": 1.0981930494308472,
                "umap_y": 2.0849719047546387,
                "color": "#0D9494"
            },
            {
                "text": "Peter Shor built on these results with his 1994 algorithm for breaking the widely used RSA and Diffie–Hellman encryption protocols,[18] which drew significant attention to the field of quantum computing. In 1996, Grover's algorithm established a quantum speedup for the widely applicable unstructured search problem.[19][20] The same year, Seth Lloyd proved that quantum computers could simulate quantum systems without the exponential overhead present in classical simulations,[21] validating Feynman's 1982 conjecture.[22]",
                "umap_x": 1.5697726011276245,
                "umap_y": 2.1224076747894287,
                "color": "#0D9494"
            },
            {
                "text": "Over the years, experimentalists have constructed small-scale quantum computers using trapped ions and superconductors.[23] In 1998, a two-qubit quantum computer demonstrated the feasibility of the technology,[24][25] and subsequent experiments have increased the number of qubits and reduced error rates.[23]",
                "umap_x": 0.4919540584087372,
                "umap_y": 0.42345884442329407,
                "color": "#0D9494"
            },
            {
                "text": "In 2019, Google AI and NASA announced that they had achieved quantum supremacy with a 54-qubit machine, performing a computation that is impossible for any classical computer.[26][27][28] However, the validity of this claim is still being actively researched.[29][30]",
                "umap_x": 2.2905447483062744,
                "umap_y": -0.8713347315788269,
                "color": "#0D9494"
            }
        ],
        "color": "#0D9494",
        "length": 6
    },
    "Quantum information processing": {
        "umap_values": [
            {
                "text": "Computer engineers typically describe a modern computer's operation in terms of classical electrodynamics. Within these 'classical' computers, some components (such as semiconductors and random number generators) may rely on quantum behavior, but these components are not isolated from their environment, so any quantum information quickly decoheres. While programmers may depend on probability theory when designing a randomized algorithm, quantum mechanical notions like superposition and interference are largely irrelevant for program analysis.",
                "umap_x": 0.028522294014692307,
                "umap_y": 1.5672953128814697,
                "color": "#2CA02C"
            },
            {
                "text": "Quantum programs, in contrast, rely on precise control of coherent quantum systems. Physicists describe these systems mathematically using linear algebra. Complex numbers model probability amplitudes, vectors model quantum states, and matrices model the operations that can be performed on these states. Programming a quantum computer is then a matter of composing operations in such a way that the resulting program computes a useful result in theory and is implementable in practice.",
                "umap_x": 0.055402472615242004,
                "umap_y": 1.6472214460372925,
                "color": "#2CA02C"
            },
            {
                "text": "As physicist Charlie Bennett describes the relationship between quantum and classical computers,[31] A classical computer is a quantum computer ... so we shouldn't be asking about 'where do quantum speedups come from?' We should say, 'well, all computers are quantum. ... Where do classical slowdowns come from?",
                "umap_x": 0.5721837282180786,
                "umap_y": 1.826233983039856,
                "color": "#2CA02C"
            },
            {
                "text": "Just as the bit is the basic concept of classical information theory, the qubit is the fundamental unit of quantum information. The same term qubit is used to refer to an abstract mathematical model and to any physical system that is represented by that model. A classical bit, by definition, exists in either of two physical states, which can be denoted 0 and 1. A qubit is also described by a state, and two states often written and serve as the quantum counterparts of the classical states 0 and 1. However, the quantum states and belong to a vector space, meaning that they can be multiplied by constants and added together, and the result is again a valid quantum state. Such a combination is known as a superposition of and .",
                "umap_x": -0.549354612827301,
                "umap_y": 1.3753950595855713,
                "color": "#2CA02C"
            },
            {
                "text": "A two-dimensional vector mathematically represents a qubit state. Physicists typically use Dirac notation for quantum mechanical linear algebra, writing 'ket psi' for a vector labeled . Because a qubit is a two-state system, any qubit state takes the form , where and are the standard basis states, [b] and and are the probability amplitudes, which are in general complex numbers.[33] If either or is zero, the qubit is effectively a classical bit; when both are nonzero, the qubit is in superposition. Such a quantum state vector acts similarly to a (classical) probability vector, with one key difference: unlike probabilities, probability amplitudes are not necessarily positive numbers.[35] Negative amplitudes allow for destructive wave interference. ",
                "umap_x": -0.6008908748626709,
                "umap_y": 1.391732096672058,
                "color": "#2CA02C"
            },
            {
                "text": "When a qubit is measured in the standard basis, the result is a classical bit. The Born rule describes the norm-squared correspondence between amplitudes and probabilities—when measuring a qubit , the state collapses to with probability , or to with probability . Any valid Quantum information processing Quantum information qubit state has coefficients and such that . As an example, measuring the qubit  would produce either or with equal probability.",
                "umap_x": -0.5564103126525879,
                "umap_y": 1.4410107135772705,
                "color": "#2CA02C"
            },
            {
                "text": "Each additional qubit doubles the dimension of the state space. [34] As an example, the vector 1 √2 |00⟩ + 1 √2 |01⟩ represents a two-qubit state, a tensor product of the qubit |0⟩ with the qubit 1 √2 |0⟩ + 1 √2 |1⟩.This vector inhabits a four-dimensional vector space spanned by the basis vectors |00⟩, |01⟩, |10⟩, and |11⟩. The Bell state 1 √2 |00⟩ + 1 √2 |11⟩ is impossible to decompose into the tensor product of two individual qubits—the two qubits are entangled because neither qubit has a state vector of its own. In general, the vector space for an n-qubit system is 2n-dimensional, and this makes it challenging for a classical computer to simulate a quantum one: representing a 100-qubit system requires storing 2100 classical values.",
                "umap_x": -0.5383066534996033,
                "umap_y": 1.312119483947754,
                "color": "#2CA02C"
            },
            {
                "text": "The state of this one-qubit quantum memory can be manipulated by applying quantum logic gates,analogous to how classical memory can be manipulated with classical logic gates. One important gate for both classical and quantum computation is the NOT gate, which can be represented by a matrix Mathematically, the application of such a logic gate to a quantum state vector is modelled with matrix multiplication. Thus",
                "umap_x": -0.2879612147808075,
                "umap_y": 1.1958420276641846,
                "color": "#2CA02C"
            },
            {
                "text": "The mathematics of single qubit gates can be extended to operate on multi-qubit quantum memories in two important ways. One way is simply to select a qubit and apply that gate to the target qubit while leaving the remainder of the memory unaffected. Another way is to apply the gate to its target only if another part of the memory is in a desired state. These two choices can be illustrated using another example. The possible states of a two-qubit quantum memory are",
                "umap_x": -0.3382124900817871,
                "umap_y": 1.255391001701355,
                "color": "#2CA02C"
            },
            {
                "text": "In summary, quantum computation can be described as a network of quantum logic gates and measurements. However, any measurement can be deferred to the end of quantum computation, though this deferment may come at a computational cost, so most quantum circuits depict a network consisting only of quantum logic gates and no measurements.",
                "umap_x": -0.004748706705868244,
                "umap_y": 1.4902197122573853,
                "color": "#2CA02C"
            },
            {
                "text": "Quantum parallelism is the heuristic that quantum computers can be thought of as evaluating a function for multiple input values simultaneously. This can be achieved by preparing a quantum system in a superposition of input states and applying a unitary transformation that encodes the function to be evaluated. The resulting state encodes the function's output values for all input values in the superposition, allowing for the computation of multiple outputs simultaneously. This property is key to the speedup of many quantum algorithms. However, 'parallelism' in this sense is insufficient to speed up a computation, because the measurement at the end of the computation gives only one value. To be useful, a quantum algorithm must also incorporate some other conceptual ingredient.",
                "umap_x": 0.8949578404426575,
                "umap_y": 1.8567074537277222,
                "color": "#2CA02C"
            },
            {
                "text": "There are a number of models of computation for quantum computing, distinguished by the basic elements in which the computation is decomposed.",
                "umap_x": 1.5867403745651245,
                "umap_y": 1.2912800312042236,
                "color": "#2CA02C"
            },
            {
                "text": "A quantum gate array decomposes computation into a sequence of few-qubit quantum gates. A quantum computation can be described as a network of quantum logic gates and measurements. However, any measurement can be deferred to the end of quantum computation, though this deferment may come at a computational cost, so most quantum circuits depict a network consisting only of quantum logic gates and no measurements.",
                "umap_x": -0.11153417080640793,
                "umap_y": 1.3837300539016724,
                "color": "#2CA02C"
            },
            {
                "text": "Any quantum computation (which is, in the above formalism, any unitary matrix of size over qubits) can be represented as a network of quantum logic gates from a fairly small family of gates. A choice of gate family that enables this construction is known as a universal gate set, since a computer that can run such circuits is a universal quantum computer. One common such set includes all single-qubit gates as well as the CNOT gate from above. This means any quantum computation can be performed by executing a sequence of single-qubit gates together with CNOT gates. Though this gate set is infinite, it can be replaced with a finite gate set by appealing to the Solovay-Kitaev theorem. Implementation of Boolean functions using the few-qubit quantum gates is presented here.[38]",
                "umap_x": 0.011396992020308971,
                "umap_y": 1.206082820892334,
                "color": "#2CA02C"
            },
            {
                "text": "A measurement-based quantum computer decomposes computation into a sequence of Bell state measurements and single-qubit quantum gates applied to a highly entangled initial state (a cluster state), using a technique called quantum gate teleportation.",
                "umap_x": -0.10138361155986786,
                "umap_y": 1.4402333498001099,
                "color": "#2CA02C"
            },
            {
                "text": "An adiabatic quantum computer, based on quantum annealing, decomposes computation into a slow continuous transformation of an initial Hamiltonian into a final Hamiltonian, whose ground states contain the solution.[39]",
                "umap_x": 1.5349268913269043,
                "umap_y": 1.6885268688201904,
                "color": "#2CA02C"
            },
            {
                "text": "Neuromorphic quantum computing (abbreviated as ‘n.quantum computing’) is an unconventional type of computing that uses neuromorphic computing to perform quantum operations. It was suggested that quantum algorithms, which are algorithms that run on a realistic model of quantum computation, can be computed equally efficiently with neuromorphic quantum computing. Both, traditional quantum computing and neuromorphic quantum computing are physics-based unconventional computing approaches to computations and do not follow the von Neumann architecture. They both construct a system (a circuit) that represents the physical problem at hand and then leverage their respective physics properties of the system to seek the “minimum”. Neuromorphic quantum computing and quantum computing share similar physical properties during computation.",
                "umap_x": 0.5785697102546692,
                "umap_y": 1.4183992147445679,
                "color": "#2CA02C"
            },
            {
                "text": "A topological quantum computer decomposes computation into the braiding of anyons in a 2D lattice.[40]",
                "umap_x": 2.595975637435913,
                "umap_y": 0.6579962372779846,
                "color": "#2CA02C"
            },
            {
                "text": "A quantum Turing machine is the quantum analog of a Turing machine.[7] All of these models of computation—quantum circuits,[41] one-way quantum computation,[42] adiabatic quantum computation,[43] and topological quantum computation[44]—have been shown to be equivalent to the quantum Turing machine; given a perfect implementation of one such quantum computer, it can simulate all the others with no more than polynomial overhead. This equivalence need not hold for practical quantum computers, since the overhead of simulation may be too large to be practical.",
                "umap_x": 0.8478159308433533,
                "umap_y": 1.5116512775421143,
                "color": "#2CA02C"
            },
            {
                "text": "The threshold theorem shows how increasing the number of qubits can mitigate errors,[45] yet fully fault- tolerant quantum computing remains \"a rather distant dream\".[46] According to some researchers, noisy intermediate-scale quantum (NISQ) machines may have specialized uses in the near future, but noise in quantum gates limits their reliability.[46] Scientists at Harvard University successfully created \"quantum circuits\" that correct errors more efficiently than alternative methods, which may potentially remove a major obstacle to practical quantum computers.[47][48] The Harvard research team was supported by MIT,QuEra Computing, Caltech, and Princeton University and funded by DARPA's Optimization with Noisy Intermediate-Scale Quantum devices (ONISQ) program.[49][50]",
                "umap_x": 0.6392452716827393,
                "umap_y": 0.7584207057952881,
                "color": "#2CA02C"
            },
            {
                "text": "Quantum computing has significant potential applications in the fields of cryptography and cybersecurity.Quantum cryptography, which relies on the principles of quantum mechanics, offers the possibility of secure communication channels that are resistant to eavesdropping. Quantum key distribution (QKD)such as BB84, enable the secure exchange of cryptographic keys between parties, ensuring the confidentiality and integrity of communication. Moreover, quantum random number generators (QRNGs) can produce high-quality random numbers, which are essential for secure encryption.",
                "umap_x": 2.4199986457824707,
                "umap_y": 2.673577308654785,
                "color": "#2CA02C"
            },
            {
                "text": "However, quantum computing also poses challenges to traditional cryptographic systems. Shor's algorithm, a quantum algorithm for integer factorization, could potentially break widely used public-key cryptography schemes like RSA, which rely on the difficulty of factoring large numbers. Post-quantum cryptography, which involves the development of cryptographic algorithms that are resistant to attacks by both classical and quantum computers, is an active area of research aimed at addressing this concern.",
                "umap_x": 1.9515422582626343,
                "umap_y": 2.4417850971221924,
                "color": "#2CA02C"
            },
            {
                "text": "Ongoing research in quantum cryptography and post-quantum cryptography is crucial for ensuring the security of communication and data in the face of evolving quantum computing capabilities. Advances in these fields, such as the development of new QKD protocols, the improvement of QRNGs, and the standardization of post-quantum cryptographic algorithms, will play a key role in maintaining the integrity and confidentiality of information in the quantum era.[51]",
                "umap_x": 2.479288339614868,
                "umap_y": 2.6752052307128906,
                "color": "#2CA02C"
            }
        ],
        "color": "#2CA02C",
        "length": 23
    },
    "Communication": {
        "umap_values": [
            {
                "text": "Quantum cryptography enables new ways to transmit data securely; for example, quantum key distribution uses entangled quantum states to establish secure cryptographic keys.[52] When a sender and receiver exchange quantum states, they can guarantee that an adversary does not intercept the message, as any unauthorized eavesdropper would disturb the delicate quantum system and introduce a detectable change.[53] With appropriate cryptographic protocols, the sender and receiver can thus establish shared private information resistant to eavesdropping.[12][54]",
                "umap_x": 2.303281545639038,
                "umap_y": 2.697122097015381,
                "color": "#C49C94"
            },
            {
                "text": "Modern fiber-optic cables can transmit quantum information over relatively short distances. Ongoing experimental research aims to develop more reliable hardware (such as quantum repeaters), hoping to scale this technology to long-distance quantum networks with end-to-end entanglement. Theoretically, this could enable novel technological applications, such as distributed quantum computing and enhanced quantum sensing.[55][56]",
                "umap_x": 0.3560844361782074,
                "umap_y": 0.8996708393096924,
                "color": "#C49C94"
            }
        ],
        "color": "#C49C94",
        "length": 2
    },
    "Algorithms": {
        "umap_values": [
            {
                "text": "Progress in finding quantum algorithms typically focuses on this quantum circuit model, though exceptions like the quantum adiabatic algorithm exist. Quantum algorithms can be roughly categorized by the type of speedup achieved over corresponding classical algorithms.[57]",
                "umap_x": 0.9663183093070984,
                "umap_y": 1.9641659259796143,
                "color": "#F7B6D2"
            },
            {
                "text": "Quantum algorithms that offer more than a polynomial speedup over the best-known classical algorithm include Shor's algorithm for factoring and the related quantum algorithms for computing discrete logarithms, solving Pell's equation, and more generally solving the hidden subgroup problem for abelian finite groups.[57] These algorithms depend on the primitive of the quantum Fourier transform. No mathematical proof has been found that shows that an equally fast classical algorithm cannot be discovered, but evidence suggests that this is unlikely.[58] Certain oracle problems like Simon's problem and the Bernstein–Vazirani problem do give provable speedups, though this is in the quantum query model, which is a restricted model where lower bounds are much easier to prove and doesn't necessarily translate to speedups for practical problems.",
                "umap_x": 1.0342055559158325,
                "umap_y": 2.243198871612549,
                "color": "#F7B6D2"
            },
            {
                "text": "Other problems, including the simulation of quantum physical processes from chemistry and solid-state physics, the approximation of certain Jones polynomials, and the quantum algorithm for linear systems of equations have quantum algorithms appearing to give super-polynomial speedups and are BQP-complete. Because these problems are BQP-complete, an equally fast classical algorithm for them would imply that no quantum algorithm gives a super-polynomial speedup, which is believed to be unlikely.[59]",
                "umap_x": 0.8643326759338379,
                "umap_y": 2.1475868225097656,
                "color": "#F7B6D2"
            },
            {
                "text": "Some quantum algorithms, like Grover's algorithm and amplitude amplification, give polynomial speedups over corresponding classical algorithms.[57] Though these algorithms give comparably modest quadratic speedup, they are widely applicable and thus give speedups for a wide range of problems.[20]",
                "umap_x": 0.8020458221435547,
                "umap_y": 2.1565487384796143,
                "color": "#F7B6D2"
            },
            {
                "text": "Since chemistry and nanotechnology rely on understanding quantum systems, and such systems are impossible to simulate in an efficient manner classically, quantum simulation may be an important application of quantum computing.[60] Quantum simulation could also be used to simulate the behavior of atoms and particles at unusual conditions such as the reactions inside a collider.[61] In June 2023, IBM computer scientists reported that a quantum computer produced better results for a physics problem than a conventional supercomputer",
                "umap_x": 0.9031517505645752,
                "umap_y": 1.0384821891784668,
                "color": "#F7B6D2"
            },
            {
                "text": "About 2% of the annual global energy output is used for nitrogen fixation to produce ammonia for the Haber process in the agricultural fertilizer industry (even though naturally occurring organisms also produce ammonia). Quantum simulations might be used to understand this process and increase the energy efficiency of production.[64] It is expected that an early use of quantum computing will be modeling that improves the efficiency of the Haber–Bosch process[65] by the mid-2020s[66] although some have predicted it will take longer",
                "umap_x": 1.1761139631271362,
                "umap_y": 1.080568790435791,
                "color": "#F7B6D2"
            },
            {
                "text": "A notable application of quantum computation is for attacks on cryptographic systems that are currently in use. Integer factorization, which underpins the security of public key cryptographic systems, is believed to be computationally infeasible with an ordinary computer for large integers if they are the product of few prime numbers (e.g., products of two 300-digit primes).[68] By comparison, a quantum computer could solve this problem exponentially faster using Shor's algorithm to find its factors.[69] This ability would allow a quantum computer to break many of the cryptographic systems in use today, in the sense that there would be a polynomial time (in the number of digits of the integer) algorithm for solving the problem. In particular, most of the popular public key ciphers are based on the difficulty of factoring integers or the discrete logarithm problem, both of which can be solved by Shor's algorithm. In particular, the RSA, Diffie–Hellman, and elliptic curve Diffie–Hellman algorithms could be broken. These are used to protect secure Web pages, encrypted email, and many other types of data. Breaking these would have significant ramifications for electronic privacy and security.",
                "umap_x": 1.6629867553710938,
                "umap_y": 2.300370454788208,
                "color": "#F7B6D2"
            },
            {
                "text": "Identifying cryptographic systems that may be secure against quantum algorithms is an actively researched topic under the field of post-quantum cryptography.[70][71] Some public-key algorithms are based on problems other than the integer factorization and discrete logarithm problems to which Shor's algorithm applies, like the McEliece cryptosystem based on a problem in coding theory.[70][72] Lattice-based cryptosystems are also not known to be broken by quantum computers, and finding a polynomial time algorithm for solving the dihedral hidden subgroup problem, which would break many lattice based cryptosystems, is a well-studied open problem.[73] It has been proven that applying Grover's algorithm to break a symmetric (secret key) algorithm by brute force requires time equal to roughly 2n/2 invocations of the underlying cryptographic algorithm, compared with roughly 2n in the classical case,[74] meaning that symmetric key lengths are effectively halved: AES-256 would have the same security against an attack using Grover's algorithm that AES-128 has against classical brute-force search ",
                "umap_x": 1.7727727890014648,
                "umap_y": 2.4024205207824707,
                "color": "#F7B6D2"
            },
            {
                "text": "The most well-known example of a problem that allows for a polynomial quantum speedup is unstructured search, which involves finding a marked item out of a list of  items in a database. This can be solved by Grover's algorithm using queries to the database, quadratically fewer than the queries required for classical algorithms. In this case, the advantage is not only provable but also optimal: it has been shown that Grover's algorithm gives the maximal possible probability of finding the desired element for any number of oracle lookups. Many examples of provable quantum speedups for query problems are based on Grover's algorithm, including Brassard, Høyer, and Tapp's algorithm for finding collisions in two-to-one functions,[75] and Farhi, Goldstone, and Gutmann's algorithm for evaluating NAND trees",
                "umap_x": 1.1857678890228271,
                "umap_y": 2.24039363861084,
                "color": "#F7B6D2"
            },
            {
                "text": "Problems that can be efficiently addressed with Grover's algorithm have the following properties:[77][78] There is no searchable structure in the collection of possible answers, The number of possible answers to check is the same as the number of inputs to the algorithm, and There exists a Boolean function that evaluates each input and determines whether it is the correct answer.",
                "umap_x": 1.2232027053833008,
                "umap_y": 2.3296992778778076,
                "color": "#F7B6D2"
            },
            {
                "text": "For problems with all these properties, the running time of Grover's algorithm on a quantum computer scales as the square root of the number of inputs (or elements in the database), as opposed to the linear scaling of classical algorithms. A general class of problems to which Grover's algorithm can be applied[79] is a Boolean satisfiability problem, where the database through which the algorithm iterates is that of all possible answers. An example and possible application of this is a password cracker that attempts to guess a password. Breaking symmetric ciphers with this algorithm is of interest to government agencies.[80]",
                "umap_x": 1.3056015968322754,
                "umap_y": 2.382495641708374,
                "color": "#F7B6D2"
            },
            {
                "text": "Quantum annealing relies on the adiabatic theorem to undertake calculations. A system is placed in the ground state for a simple Hamiltonian, which slowly evolves to a more complicated Hamiltonian whose ground state represents the solution to the problem in question. The adiabatic theorem states that if the evolution is slow enough the system will stay in its ground state at all times through the process. Adiabatic optimization may be helpful for solving computational biology problems.",
                "umap_x": 1.4668149948120117,
                "umap_y": 1.727697730064392,
                "color": "#F7B6D2"
            },
            {
                "text": "Since quantum computers can produce outputs that classical computers cannot produce efficiently, and since quantum computation is fundamentally linear algebraic, some express hope in developing quantum algorithms that can speed up machine learning tasks",
                "umap_x": 0.6700789332389832,
                "umap_y": 1.6007310152053833,
                "color": "#F7B6D2"
            },
            {
                "text": "For example, the HHL Algorithm, named after its discoverers Harrow, Hassidim, and Lloyd, is believed to provide speedup over classical counterparts.[46][83] Some research groups have recently explored the use of quantum annealing hardware for training Boltzmann machines and deep neural networks",
                "umap_x": 1.262600302696228,
                "umap_y": 1.9176263809204102,
                "color": "#F7B6D2"
            },
            {
                "text": "Deep generative chemistry models emerge as powerful tools to expedite drug discovery. However, the immense size and complexity of the structural space of all possible drug-like molecules pose significant obstacles, which could be overcome in the future by quantum computers. Quantum computers are naturally good for solving complex quantum many-body problems[21] and thus may be instrumental in applications involving quantum chemistry. Therefore, one can expect that quantum-enhanced generative models[87] including quantum GANs[88] may eventually be developed into ultimate generative chemistry algorithms.",
                "umap_x": 2.2175590991973877,
                "umap_y": 1.0232657194137573,
                "color": "#F7B6D2"
            }
        ],
        "color": "#F7B6D2",
        "length": 15
    },
    "Engineering": {
        "umap_values": [
            {
                "text": "As of 2023, classical computers outperform quantum computers for all real-world applications. While current quantum computers may speed up solutions to particular mathematical problems, they give no computational advantage for practical tasks. Scientists and engineers are exploring multiple technologies for quantum computing hardware and hope to develop scalable quantum architectures, but serious obstacles remain",
                "umap_x": 0.6176280379295349,
                "umap_y": 0.9936668872833252,
                "color": "#8C6D31"
            },
            {
                "text": "There are a number of technical challenges in building a large-scale quantum computer.[91] Physicist David DiVincenzo has listed these requirements for a practical quantum computer:[92] Physically scalable to increase the number of qubits, Qubits that can be initialized to arbitrary values,Quantum gates that are faster than decoherence time,Universal gate set,Qubits that can be read easily.",
                "umap_x": 0.4618481397628784,
                "umap_y": 0.7086660861968994,
                "color": "#8C6D31"
            },
            {
                "text": "Sourcing parts for quantum computers is also very difficult. Superconducting quantum computers, like those constructed by Google and IBM, need helium-3, a nuclear research byproduct, and special superconducting cables made only by the Japanese company Coax Co",
                "umap_x": 0.8016822934150696,
                "umap_y": 0.02155805192887783,
                "color": "#8C6D31"
            },
            {
                "text": "The control of multi-qubit systems requires the generation and coordination of a large number of electrical signals with tight and deterministic timing resolution. This has led to the development of quantum controllers that enable interfacing with the qubits. Scaling these systems to support a growing number of qubits is an additional challenge.",
                "umap_x": 0.1720615178346634,
                "umap_y": 0.7417024970054626,
                "color": "#8C6D31"
            },
            {
                "text": "One of the greatest challenges involved with constructing quantum computers is controlling or removing quantum decoherence. This usually means isolating the system from its environment as interactions with the external world cause the system to decohere. However, other sources of decoherence also exist. Examples include the quantum gates, and the lattice vibrations and background thermonuclear spin of the physical system used to implement the qubits. Decoherence is irreversible, as it is effectively non-unitary, and is usually something that should be highly controlled, if not avoided. Decoherence times for candidate systems in particular, the transverse relaxation time T2 (for NMR and MRI technology, also called the dephasing time), typically range between nanoseconds and seconds at low temperature.[95] Currently, some quantum computers require their qubits to be cooled to 20 millikelvin (usually using a dilution refrigerator[96]) in order to prevent significant decoherence.[97] A 2020 study argues that ionizing radiation such as cosmic rays can nevertheless cause certain systems to decohere within milliseconds.",
                "umap_x": 1.0137070417404175,
                "umap_y": 0.6063175797462463,
                "color": "#8C6D31"
            },
            {
                "text": "As a result, time-consuming tasks may render some quantum algorithms inoperable, as attempting to maintain the state of qubits for a long enough duration will eventually corrupt the superpositions.",
                "umap_x": 0.2940506339073181,
                "umap_y": 1.1986160278320312,
                "color": "#8C6D31"
            },
            {
                "text": "These issues are more difficult for optical approaches as the timescales are orders of magnitude shorter and an often-cited approach to overcoming them is optical pulse shaping. Error rates are typically proportional to the ratio of operating time to decoherence time; hence any operation must be completed much more quickly than the decoherence time.",
                "umap_x": 1.0211601257324219,
                "umap_y": 0.6210765242576599,
                "color": "#8C6D31"
            },
            {
                "text": "As described by the threshold theorem, if the error rate is small enough, it is thought to be possible to use quantum error correction to suppress errors and decoherence. This allows the total calculation time to be longer than the decoherence time if the error correction scheme can correct errors faster than decoherence introduces them. An often-cited figure for the required error rate in each gate for fault-tolerant computation is 10−3, assuming the noise is depolarizing.",
                "umap_x": 0.9342657327651978,
                "umap_y": 0.7134855389595032,
                "color": "#8C6D31"
            },
            {
                "text": "Meeting this scalability condition is possible for a wide range of systems. However, the use of error correction brings with it the cost of a greatly increased number of required qubits. The number required to factor integers using Shor's algorithm is still polynomial, and thought to be between L and L2, where L is the number of binary digits in the number to be factored; error correction algorithms would inflate this figure by an additional factor of L. For a 1000-bit number, this implies a need for about 104 bits without error correction.[100] With error correction, the figure would rise to about 107 bits. Computation time is about L2 or about 107 steps and at 1 MHz, about 10 seconds. However, the encoding and error-correction overheads increase the size of a real fault-tolerant quantum computer by several orders of magnitude. Careful estimates[101][102] show that at least 3 million physical qubits would factor 2,048-bit integer in 5 months on a fully error-corrected trapped-ion quantum computer. In terms of the number of physical qubits, to date, this remains the lowest estimate[103] for practically useful integer factorization problem sizing 1,024-bit or larger.",
                "umap_x": 0.8025233745574951,
                "umap_y": 0.8091784119606018,
                "color": "#8C6D31"
            },
            {
                "text": "Another approach to the stability-decoherence problem is to create a topological quantum computer with anyons, quasi-particles used as threads, and relying on braid theory to form stable logic gates",
                "umap_x": 2.3360679149627686,
                "umap_y": 0.6301635503768921,
                "color": "#8C6D31"
            },
            {
                "text": "Physicist John Preskill coined the term quantum supremacy to describe the engineering feat of demonstrating that a programmable quantum device can solve a problem beyond the capabilities of state-of-the-art classical computers.[106][107][108] The problem need not be useful, so some view the quantum supremacy test only as a potential future benchmark.",
                "umap_x": 1.8266806602478027,
                "umap_y": -0.7742878794670105,
                "color": "#8C6D31"
            },
            {
                "text": "In October 2019, Google AI Quantum, with the help of NASA, became the first to claim to have achieved quantum supremacy by performing calculations on the Sycamore quantum computer more than 3,000,000 times faster than they could be done on Summit, generally considered the world's fastest computer.[27][110][111] This claim has been subsequently challenged: IBM has stated that Summit can perform samples much faster than claimed,[112][113] and researchers have since developed better algorithms for the sampling problem used to claim quantum supremacy, giving substantial reductions to the gap between Sycamore and classical supercomputers[114][115][116] and even beating it.",
                "umap_x": 2.200669288635254,
                "umap_y": -0.8175656199455261,
                "color": "#8C6D31"
            },
            {
                "text": "In December 2020, a group at USTC implemented a type of Boson sampling on 76 photons with a photonic quantum computer, Jiuzhang, to demonstrate quantum supremacy.[120][121][122] The authors claim that a classical contemporary supercomputer would require a computational time of 600 million years to generate the number of samples their quantum processor can generate in 20 seconds",
                "umap_x": 2.175072193145752,
                "umap_y": -0.4714457094669342,
                "color": "#8C6D31"
            },
            {
                "text": "Claims of quantum supremacy have generated hype around quantum computing,[124] but they are based on contrived benchmark tasks that do not directly imply useful real-world applications",
                "umap_x": 1.9545303583145142,
                "umap_y": -0.7318933606147766,
                "color": "#8C6D31"
            },
            {
                "text": "In January 2024, a study published in Physical Review Letters provided direct verification of quantum supremacy experiments by computing exact amplitudes for experimentally generated bitstrings using a new-generation Sunway supercomputer, demonstrating a significant leap in simulation capability built on a multiple-amplitude tensor network contraction algorithm. This development underscores the evolving landscape of quantum computing, highlighting both the progress and the complexities involved in validating quantum supremacy claims.",
                "umap_x": 1.706965684890747,
                "umap_y": -0.7218847274780273,
                "color": "#8C6D31"
            },
            {
                "text": "Despite high hopes for quantum computing, significant progress in hardware, and optimism about future applications, a 2023 Nature spotlight article summarized current quantum computers as being \"For now, [good for] absolutely nothing\".[89] The article elaborated that quantum computers are yet to be more useful or efficient than conventional computers in any case, though it also argued that in the long term such computers are likely to be useful. A 2023 Communications of the ACM article[90] found that current quantum computing algorithms are \"insufficient for practical quantum advantage without significant improvements across the software/hardware stack\". It argues that the most promising candidates for achieving speedup with quantum computers are \"small-data problems\", for example in chemistry and materials science. However, the article also concludes that a large range of the potential applications it considered, such as machine learning, \"will not achieve quantum advantage with current quantum algorithms in the foreseeable future\", and it identified I/O constraints that make speedup unlikely for \"big data problems, unstructured linear systems, and database search based on Grover's algorithm\".",
                "umap_x": 1.2010154724121094,
                "umap_y": 1.2708156108856201,
                "color": "#8C6D31"
            },
            {
                "text": "This state of affairs can be traced to several current and long-term considerations. Conventional computer hardware and algorithms are not only optimized for practical tasks, but are still improving rapidly, particularly GPU accelerators. Current quantum computing hardware generates only a limited amount of entanglement before getting overwhelmed by noise. Quantum algorithms provide speedup over conventional algorithms only for some tasks, and matching these tasks with practical applications proved challenging. Some promising tasks and applications require resources far beyond those available today.[127][128] In particular, processing large amounts of non-quantum data is a challenge for quantum computers.[90] Some promising algorithms have been 'dequantized', i.e., their non-quantum analogues with similar complexity have been found. If quantum error correction is used to scale quantum computers to practical applications, its overhead may undermine speedup offered by many quantum algorithms.[90] Complexity analysis of algorithms sometimes makes abstract assumptions that do not hold in applications. For example, input data may not already be available encoded in quantum states, and 'oracle functions' used in Grover's algorithm often have internal structure that can be exploited for faster algorithms.",
                "umap_x": 0.8524503111839294,
                "umap_y": 1.5732321739196777,
                "color": "#8C6D31"
            },
            {
                "text": "In particular, building computers with large numbers of qubits may be futile if those qubits are not connected well enough and cannot maintain sufficiently high degree of entanglement for a long time. When trying to outperform conventional computers, quantum computing researchers often look for new tasks that can be solved on quantum computers, but this leaves the possibility that efficient non-quantum techniques will be developed in response, as seen for Quantum supremacy demonstrations. Therefore, it is desirable to prove lower bounds on the complexity of best possible non-quantum algorithms (which may be unknown) and show that some quantum algorithms asymptomatically improve upon those bounds.",
                "umap_x": 0.8398752212524414,
                "umap_y": 1.5835297107696533,
                "color": "#8C6D31"
            },
            {
                "text": "Some researchers have expressed skepticism that scalable quantum computers could ever be built, typically because of the issue of maintaining coherence at large scales, but also for other reasons.",
                "umap_x": 0.5767173171043396,
                "umap_y": 0.6424474120140076,
                "color": "#8C6D31"
            },
            {
                "text": "Bill Unruh doubted the practicality of quantum computers in a paper published in 1994.[129] Paul Davies argued that a 400-qubit computer would even come into conflict with the cosmological information bound implied by the holographic principle.[130] Skeptics like Gil Kalai doubt that quantum supremacy will ever be achieved.[131][132][133] Physicist Mikhail Dyakonov has expressed skepticism of quantum computing as follows:'So the number of continuous parameters describing the state of such a useful quantum computer at any given moment must be... about 10300... Could we ever learn to control the more than 10300 continuously variable parameters defining the quantum state of such a system? My answer is simple. No, never.",
                "umap_x": 0.7806536555290222,
                "umap_y": 0.6628109216690063,
                "color": "#8C6D31"
            },
            {
                "text": "A practical quantum computer must use a physical system as a programmable quantum register.[137] Researchers are exploring several technologies as candidates for reliable qubit implementations.[138] Superconductors and trapped ions are some of the most developed proposals, but experimentalists are considering other hardware possibilities as well.",
                "umap_x": 0.5012415647506714,
                "umap_y": 0.20415668189525604,
                "color": "#8C6D31"
            },
            {
                "text": "The first quantum logic gates were implemented with trapped ions and prototype general purpose machines with up to 20 qubits have been realized. However, the technology behind these devices combines complex vacuum equipment, lasers, microwave and radio frequency equipment making full scale processors difficult to integrate with standard computing equipment. Moreover, the trapped ion system itself has engineering challenges to overcome",
                "umap_x": 0.2598760724067688,
                "umap_y": 0.4714110195636749,
                "color": "#8C6D31"
            },
            {
                "text": "The largest commercial systems are based on superconductor devices and have scaled to 2000 qubits. However, the error rates for larger machines have been on the order of 5%. Technologically these devices are all cryogenic and scaling to large numbers of qubits requires wafer-scale integration, a serious engineering challenge by itself.",
                "umap_x": 0.36803868412971497,
                "umap_y": 0.355311781167984,
                "color": "#8C6D31"
            },
            {
                "text": "Research efforts to create stabler qubits for quantum computing include topological quantum computer approaches. For example, Microsoft is working on a computer based on the quantum properties of two-dimensional quasiparticles called anyons.",
                "umap_x": 2.078856945037842,
                "umap_y": 0.57254558801651,
                "color": "#8C6D31"
            }
        ],
        "color": "#8C6D31",
        "length": 24
    },
    "Potential applications": {
        "umap_values": [
            {
                "text": "With focus on business management's point of view, the potential applications of quantum computing into four major categories are cybersecurity, data analytics and artificial intelligence, optimization and simulation, and data management and searching",
                "umap_x": 1.3966387510299683,
                "umap_y": 0.9030690789222717,
                "color": "#D62728"
            },
            {
                "text": "Investment in quantum computing research has increased in the public and private sectors.[146][147] As one consulting firm summarized,[148] ... investment dollars are pouring in, and quantum-computing start-ups are proliferating. ... While quantum computing promises to help businesses solve problems that are beyond the reach and speed of conventional high-performance computers, use cases are largely experimental and hypothetical at this early stage.",
                "umap_x": 1.4929343461990356,
                "umap_y": 0.7673362493515015,
                "color": "#D62728"
            }
        ],
        "color": "#D62728",
        "length": 2
    },
    "Theory": {
        "umap_values": [
            {
                "text": "Any computational problem solvable by a classical computer is also solvable by a quantum computer.[149] Intuitively, this is because it is believed that all physical phenomena, including the operation of classical computers, can be described using quantum mechanics, which underlies the operation of quantum computers.",
                "umap_x": 0.4134349822998047,
                "color": "#9467BD",
                "umap_y": 1.828526496887207
            },
            {
                "text": "Conversely, any problem solvable by a quantum computer is also solvable by a classical computer. It is possible to simulate both quantum and classical computers manually with just some paper and a pen, if given enough time. More formally, any quantum computer can be simulated by a Turing machine. In other words, quantum computers provide no additional power over classical computers in terms of computability. This means that quantum computers cannot solve undecidable problems like the halting problem, and the existence of quantum computers does not disprove the Church–Turing thesis.",
                "umap_x": 0.4777086675167084,
                "color": "#9467BD",
                "umap_y": 1.6621023416519165
            },
            {
                "text": "While quantum computers cannot solve any problems that classical computers cannot already solve, it is suspected that they can solve certain problems faster than classical computers. For instance, it is known that quantum computers can efficiently factor integers, while this is not believed to be the case for classical computers.",
                "umap_x": 0.4841994643211365,
                "color": "#9467BD",
                "umap_y": 1.8920774459838867
            },
            {
                "text": "The class of problems that can be efficiently solved by a quantum computer with bounded error is called BQP, for \"bounded error, quantum, polynomial time\". More formally, BQP is the class of problems that can be solved by a polynomial-time quantum Turing machine with an error probability of at most 1/3. As a class of probabilistic problems, BQP is the quantum counterpart to BPP (\"bounded error, probabilistic, polynomial time\"), the class of problems that can be solved by polynomial-time probabilistic Turing machines with bounded error.[152] It is known that and is widely suspected that , which intuitively would mean that quantum computers are more powerful than classical computers in terms of time complexity.[153]",
                "umap_x": 0.5323027968406677,
                "color": "#9467BD",
                "umap_y": 1.9139405488967896
            },
            {
                "text": "The exact relationship of BQP to P, NP, and PSPACE is not known. However, it is known that ; that is, all problems that can be efficiently solved by a deterministic classical computer can also be efficiently solved by a quantum computer, and all problems that can be efficiently solved by a quantum computer can also be solved by a deterministic classical computer with polynomial space resources. It is further suspected that BQP is a strict superset of P, meaning there are problems that are efficiently solvable by quantum computers that are not efficiently solvable by deterministic classical computers. For instance, integer factorization and the discrete logarithm problem are known to be in BQP and are suspected to be outside of P. On the relationship of BQP to NP, little is known beyond the fact that some NP problems that are believed not to be in P are also in BQP (integer factorization and the discrete logarithm problem are both in NP, for example). It is suspected that ; that is, it is believed that there are efficiently checkable problems that are not efficiently solvable by a quantum computer. As a direct consequence of this belief, it is also suspected that BQP is disjoint from the class of NP-complete problems (if an NP-complete problem were in BQP, then it would follow from NP-hardness that all problems in NP are in BQP).[154]",
                "umap_x": 0.5512145757675171,
                "color": "#9467BD",
                "umap_y": 1.9698594808578491
            }
        ],
        "color": "#9467BD",
        "length": 5
    },
    "Notes": {
        "umap_values": [
            {
                "text": " As used in this article, 'exponentially faster' has a precise complexity theoretical meaning. Usually, it means that as a function of input size in bits, the best known classical algorithm for a problem requires an exponentially growing number of steps, while a quantum algorithm uses only a polynomial number of steps.",
                "umap_x": 0.7756083607673645,
                "umap_y": 2.08731746673584,
                "color": "#1d3445"
            },
            {
                "text": "The standard basis is also the computational basis.",
                "umap_x": 2.0166516304016113,
                "umap_y": 1.4026228189468384,
                "color": "#1d3445"
            }
        ],
        "color": "#1d3445",
        "length": 2
    },
    "References": {
        "umap_values": [
            {
                "text": "References 5. Hodges, Andrew (2014). Alan Turing: The Enigma. Princeton, New Jersey: Princeton",
                "umap_x": 4.9132232666015625,
                "umap_y": 1.3740776777267456,
                "color": "#BCBD22"
            },
            {
                "text": "University Press. p. xviii. ISBN 9780691164724. 6. Mårtensson-Pendrill, Ann-Marie (1 November 2006). \"The Manhattan project—a part of physics history\". Physics Education. 41 (6): 493–501. Bibcode:2006PhyEd..41..493M (http s://ui.adsabs.harvard.edu/abs/2006PhyEd..41..493M). doi:10.1088/0031-9120/41/6/001 (htt ps://doi.org/10.1088%2F0031-9120%2F41%2F6%2F001). ISSN 0031-9120 (https://search. worldcat.org/issn/0031-9120). S2CID 120294023 (https://api.semanticscholar.org/CorpusID: 120294023). 7. Benioff, Paul (1980). \"The computer as a physical system: A microscopic quantum mechanical Hamiltonian model of computers as represented by Turing machines\". Journal of Statistical Physics. 22 (5): 563–591. Bibcode:1980JSP....22..563B (https://ui.adsabs.harv ard.edu/abs/1980JSP....22..563B). doi:10.1007/bf01011339 (https://doi.org/10.1007%2Fbf0 1011339). S2CID 122949592 (https://api.semanticscholar.org/CorpusID:122949592). 8. Buluta, Iulia; Nori, Franco (2 October 2009). \"Quantum Simulators\". Science. 326 (5949): 108–111. Bibcode:2009Sci...326..108B (https://ui.adsabs.harvard.edu/abs/2009Sci...326..10 8B). doi:10.1126/science.1177838 (https://doi.org/10.1126%2Fscience.1177838).",
                "umap_x": 4.179140090942383,
                "umap_y": 0.6427118182182312,
                "color": "#BCBD22"
            },
            {
                "text": "ISSN 0036-8075 (https://search.worldcat.org/issn/0036-8075). PMID 19797653 (https://pub med.ncbi.nlm.nih.gov/19797653). S2CID 17187000 (https://api.semanticscholar.org/CorpusI",
                "umap_x": 6.4095988273620605,
                "umap_y": 3.8645308017730713,
                "color": "#BCBD22"
            },
            {
                "text": "D:17187000). 9. Manin, Yu. I. (1980). Vychislimoe i nevychislimoe (https://web.archive.org/web/20130510173 823/http://publ.lib.ru/ARCHIVES/M/MANIN_Yuriy_Ivanovich/Manin_Yu.I._Vychislimoe_i_nev ychislimoe.(1980).%5Bdjv%5D.zip) [Computable and Noncomputable] (in Russian). Soviet",
                "umap_x": 6.022134304046631,
                "umap_y": 3.1214494705200195,
                "color": "#BCBD22"
            },
            {
                "text": "Radio. pp. 13–15. Archived from the original (http://publ.lib.ru/ARCHIVES/M/MANIN_Yuriy_I vanovich/Manin_Yu.I._Vychislimoe_i_nevychislimoe.(1980).%5bdjv-fax%5d.zip) on 10 May 2013. Retrieved 4 March 2013. 10. Feynman, Richard (June 1982). \"Simulating Physics with Computers\" (https://web.archive.or g/web/20190108115138/https://people.eecs.berkeley.edu/~christos/classics/Feynman.pdf) (PDF). International Journal of Theoretical Physics. 21 (6/7): 467–488.",
                "umap_x": 4.214406490325928,
                "umap_y": 0.7988387942314148,
                "color": "#BCBD22"
            },
            {
                "text": "Bibcode:1982IJTP...21..467F (https://ui.adsabs.harvard.edu/abs/1982IJTP...21..467F). doi:10.1007/BF02650179 (https://doi.org/10.1007%2FBF02650179). S2CID 124545445 (htt ps://api.semanticscholar.org/CorpusID:124545445). Archived from the original (https://peopl e.eecs.berkeley.edu/~christos/classics/Feynman.pdf) (PDF) on 8 January 2019. Retrieved 28 February 2019. 11. Nielsen & Chuang 2010, p. 214. 12. Bennett, Charles H.; Brassard, Gilles (December 1984). Quantum cryptography: Public key distribution and coin tossing. IEEE International Conference on Computers, Systems &",
                "umap_x": 3.9442243576049805,
                "umap_y": 1.4369255304336548,
                "color": "#BCBD22"
            },
            {
                "text": "Signal Processing. Bangalore, India. pp. 175–179. arXiv:2003.06557 (https://arxiv.org/abs/2 003.06557). doi:10.1016/j.tcs.2014.05.025 (https://doi.org/10.1016%2Fj.tcs.2014.05.025). 13. Brassard, G. (2005). \"Brief history of quantum cryptography: A personal perspective\" (http s://ieeexplore.ieee.org/document/1543949). IEEE Information Theory Workshop on Theory and Practice in Information-Theoretic Security, 2005. Awaji Island, Japan: IEEE. pp. 19–23. arXiv:quant-ph/0604072 (https://arxiv.org/abs/quant-ph/0604072). doi:10.1109/ITWTPI.2005.1543949 (https://doi.org/10.1109%2FITWTPI.2005.1543949).",
                "umap_x": 2.999408483505249,
                "umap_y": 2.6209323406219482,
                "color": "#BCBD22"
            },
            {
                "text": "ISBN 978-0-7803-9491-9. S2CID 16118245 (https://api.semanticscholar.org/CorpusID:1611 8245). 14. Deutsch, D. (8 July 1985). \"Quantum theory, the Church–Turing principle and the universal quantum computer\". Proceedings of the Royal Society of London. A. Mathematical and",
                "umap_x": 5.0816240310668945,
                "umap_y": 1.3039284944534302,
                "color": "#BCBD22"
            },
            {
                "text": "Physical Sciences. 400 (1818): 97–117. Bibcode:1985RSPSA.400...97D (https://ui.adsabs.h arvard.edu/abs/1985RSPSA.400...97D). doi:10.1098/rspa.1985.0070 (https://doi.org/10.109 8%2Frspa.1985.0070). ISSN 0080-4630 (https://search.worldcat.org/issn/0080-4630).",
                "umap_x": 5.230557918548584,
                "umap_y": 5.536890029907227,
                "color": "#BCBD22"
            },
            {
                "text": "S2CID 1438116 (https://api.semanticscholar.org/CorpusID:1438116). 15. Bernstein, Ethan; Vazirani, Umesh (1993). \"Quantum complexity theory\" (http://portal.acm.or g/citation.cfm?doid=167088.167097). Proceedings of the twenty-fifth annual ACM symposium on Theory of computing – STOC '93. San Diego, California, United States: ACM",
                "umap_x": 4.3434739112854,
                "umap_y": 1.436495304107666,
                "color": "#BCBD22"
            },
            {
                "text": "Press. pp. 11–20. doi:10.1145/167088.167097 (https://doi.org/10.1145%2F167088.167097).",
                "umap_x": 5.614981651306152,
                "umap_y": 5.136242866516113,
                "color": "#BCBD22"
            },
            {
                "text": "ISBN 978-0-89791-591-5. S2CID 676378 (https://api.semanticscholar.org/CorpusID:67637 8). 16. Simon, D. R. (1994). \"On the power of quantum computation\" (https://ieeexplore.ieee.org/do cument/365701). Proceedings 35th Annual Symposium on Foundations of Computer",
                "umap_x": 4.439387798309326,
                "umap_y": 1.4418412446975708,
                "color": "#BCBD22"
            },
            {
                "text": "Science. Santa Fe, New Mexico, USA: IEEE Comput. Soc. Press. pp. 116–123. doi:10.1109/SFCS.1994.365701 (https://doi.org/10.1109%2FSFCS.1994.365701).",
                "umap_x": 4.925993919372559,
                "umap_y": 4.813317775726318,
                "color": "#BCBD22"
            },
            {
                "text": "ISBN 978-0-8186-6580-6. S2CID 7457814 (https://api.semanticscholar.org/CorpusID:74578 14). 17. Nielsen & Chuang 2010, p. 30-32. 18. Shor 1994. 19. Grover, Lov K. (1996). A fast quantum mechanical algorithm for database search. ACM symposium on Theory of computing. Philadelphia: ACM Press. pp. 212–219. arXiv:quant- ph/9605043 (https://arxiv.org/abs/quant-ph/9605043). doi:10.1145/237814.237866 (https://d oi.org/10.1145%2F237814.237866). ISBN 978-0-89791-785-8. 20. Nielsen & Chuang 2010, p. 7. 21. Lloyd, Seth (23 August 1996). \"Universal Quantum Simulators\". Science. 273 (5278): 1073– 1078. Bibcode:1996Sci...273.1073L (https://ui.adsabs.harvard.edu/abs/1996Sci...273.1073",
                "umap_x": 3.496020793914795,
                "umap_y": 1.4925055503845215,
                "color": "#BCBD22"
            },
            {
                "text": "L). doi:10.1126/science.273.5278.1073 (https://doi.org/10.1126%2Fscience.273.5278.107 3). ISSN 0036-8075 (https://search.worldcat.org/issn/0036-8075). PMID 8688088 (https://pu bmed.ncbi.nlm.nih.gov/8688088). S2CID 43496899 (https://api.semanticscholar.org/CorpusI",
                "umap_x": 6.181881904602051,
                "umap_y": 4.168565273284912,
                "color": "#BCBD22"
            },
            {
                "text": "D:43496899). 22. Cao, Yudong; Romero, Jonathan; Olson, Jonathan P.; Degroote, Matthias; Johnson, Peter",
                "umap_x": 7.409712791442871,
                "umap_y": 3.9566898345947266,
                "color": "#BCBD22"
            },
            {
                "text": "D.; et al. (9 October 2019). \"Quantum Chemistry in the Age of Quantum Computing\".",
                "umap_x": 3.692732810974121,
                "umap_y": 0.3592861294746399,
                "color": "#BCBD22"
            },
            {
                "text": "Chemical Reviews. 119 (19): 10856–10915. arXiv:1812.09976 (https://arxiv.org/abs/1812.09 976). doi:10.1021/acs.chemrev.8b00803 (https://doi.org/10.1021%2Facs.chemrev.8b00803).",
                "umap_x": 5.517415523529053,
                "umap_y": 5.579504013061523,
                "color": "#BCBD22"
            },
            {
                "text": "ISSN 0009-2665 (https://search.worldcat.org/issn/0009-2665). PMID 31469277 (https://pub med.ncbi.nlm.nih.gov/31469277). S2CID 119417908 (https://api.semanticscholar.org/Corpu sID:119417908). 23. Grumbling & Horowitz 2019, pp. 164–169. 24. Chuang, Isaac L.; Gershenfeld, Neil; Kubinec, Markdoi (April 1998). \"Experimental",
                "umap_x": 5.709394931793213,
                "umap_y": 4.733200550079346,
                "color": "#BCBD22"
            },
            {
                "text": "Implementation of Fast Quantum Searching\". Physical Review Letters. 80 (15). American",
                "umap_x": 2.8448097705841064,
                "umap_y": 1.7768332958221436,
                "color": "#BCBD22"
            },
            {
                "text": "Physical Society: 3408–3411. Bibcode:1998PhRvL..80.3408C (https://ui.adsabs.harvard.ed u/abs/1998PhRvL..80.3408C). doi:10.1103/PhysRevLett.80.3408 (https://doi.org/10.1103%2",
                "umap_x": 5.151061534881592,
                "umap_y": 5.595361232757568,
                "color": "#BCBD22"
            },
            {
                "text": "FPhysRevLett.80.3408). 25. Holton, William Coffeen. \"quantum computer\" (https://www.britannica.com/technology/quant um-computer). Encyclopedia Britannica. Encyclopædia Britannica. Retrieved 4 December 2021. 26. Gibney, Elizabeth (23 October 2019). \"Hello quantum world! Google publishes landmark quantum supremacy claim\" (https://doi.org/10.1038%2Fd41586-019-03213-z). Nature. 574 (7779): 461–462. Bibcode:2019Natur.574..461G (https://ui.adsabs.harvard.edu/abs/2019Nat ur.574..461G). doi:10.1038/d41586-019-03213-z (https://doi.org/10.1038%2Fd41586-019-0 3213-z). PMID 31645740 (https://pubmed.ncbi.nlm.nih.gov/31645740). 27. Lay summary: Martinis, John; Boixo, Sergio (23 October 2019). \"Quantum Supremacy",
                "umap_x": 2.774041175842285,
                "umap_y": -0.3210608661174774,
                "color": "#BCBD22"
            },
            {
                "text": "Using a Programmable Superconducting Processor\" (https://ai.googleblog.com/2019/10/qua ntum-supremacy-using-programmable.html). Nature. 574 (7779). Google AI: 505–510. arXiv:1910.11333 (https://arxiv.org/abs/1910.11333). Bibcode:2019Natur.574..505A (https:// ui.adsabs.harvard.edu/abs/2019Natur.574..505A). doi:10.1038/s41586-019-1666-5 (https://d oi.org/10.1038%2Fs41586-019-1666-5). PMID 31645734 (https://pubmed.ncbi.nlm.nih.gov/ 31645734). S2CID 204836822 (https://api.semanticscholar.org/CorpusID:204836822).",
                "umap_x": 1.7176597118377686,
                "umap_y": -0.02481239289045334,
                "color": "#BCBD22"
            },
            {
                "text": "Retrieved 27 April 2022. • Journal article: Arute, Frank; Arya, Kunal; Babbush, Ryan; Bacon, Dave; Bardin, Joseph",
                "umap_x": 7.000141143798828,
                "umap_y": 3.35359525680542,
                "color": "#BCBD22"
            },
            {
                "text": "C.; et al. (23 October 2019). \"Quantum supremacy using a programmable superconducting processor\". Nature. 574 (7779): 505–510. arXiv:1910.11333 (https://arxiv.org/abs/1910.1133 3). Bibcode:2019Natur.574..505A (https://ui.adsabs.harvard.edu/abs/2019Natur.574..505A). doi:10.1038/s41586-019-1666-5 (https://doi.org/10.1038%2Fs41586-019-1666-5).",
                "umap_x": 1.6210373640060425,
                "umap_y": -0.5540800094604492,
                "color": "#BCBD22"
            },
            {
                "text": "PMID 31645734 (https://pubmed.ncbi.nlm.nih.gov/31645734). S2CID 204836822 (https://ap i.semanticscholar.org/CorpusID:204836822). 28. Aaronson, Scott (30 October 2019). \"Opinion | Why Google's Quantum Supremacy",
                "umap_x": 2.7193844318389893,
                "umap_y": -0.7334796786308289,
                "color": "#BCBD22"
            },
            {
                "text": "Milestone Matters\" (https://www.nytimes.com/2019/10/30/opinion/google-quantum-computer -sycamore.html). The New York Times. ISSN 0362-4331 (https://search.worldcat.org/issn/03 62-4331). Retrieved 25 September 2021. 29. Pednault, Edwin (22 October 2019). \"On 'Quantum Supremacy' \" (https://www.ibm.com/blog s/research/2019/10/on-quantum-supremacy/). IBM Research Blog. Retrieved 9 February 2021. 30. Pan, Feng; Zhang, Pan (4 March 2021). \"Simulating the Sycamore quantum supremacy circuits\". arXiv:2103.03074 (https://arxiv.org/abs/2103.03074) [quant-ph (https://arxiv.org/arc hive/quant-ph)]. 31. Bennett, Charlie (31 July 2020). Information Is Quantum: How Physics Helped Explain the",
                "umap_x": 2.31327748298645,
                "umap_y": -0.39199647307395935,
                "color": "#BCBD22"
            },
            {
                "text": "Nature of Information and What Can Be Done With It (https://www.youtube.com/live/rslt-Lwt",
                "umap_x": 5.656223297119141,
                "umap_y": 1.4008705615997314,
                "color": "#BCBD22"
            },
            {
                "text": "DK4&t=4102) (Videotape). Event occurs at 1:08:22 – via YouTube. 32. Nielsen & Chuang 2010, p. 13. 33. Mermin 2007, p. 17. 34. Mermin 2007, p. 18. 35. Aaronson 2013, p. 110. 36. Nielsen & Chuang 2010, p. 30–32. 37. Mermin 2007, pp. 38–39. 38. Kurgalin, Sergei; Borzunov, Sergei (2021). Concise guide to quantum computing: algorithms, exercises, and implementations. Texts in computer science. Cham: Springer.",
                "umap_x": 4.115576267242432,
                "umap_y": 0.998310923576355,
                "color": "#BCBD22"
            },
            {
                "text": "ISBN 978-3-030-65054-4. 39. Das, A.; Chakrabarti, B. K. (2008). \"Quantum Annealing and Analog Quantum Computation\".",
                "umap_x": 4.1308088302612305,
                "umap_y": 1.2135341167449951,
                "color": "#BCBD22"
            },
            {
                "text": "Rev. Mod. Phys. 80 (3): 1061–1081. arXiv:0801.2193 (https://arxiv.org/abs/0801.2193).",
                "umap_x": 4.9443440437316895,
                "umap_y": 5.226520538330078,
                "color": "#BCBD22"
            },
            {
                "text": "Bibcode:2008RvMP...80.1061D (https://ui.adsabs.harvard.edu/abs/2008RvMP...80.1061D).",
                "umap_x": 5.8529839515686035,
                "umap_y": 5.98764705657959,
                "color": "#BCBD22"
            },
            {
                "text": "CiteSeerX 10.1.1.563.9990 (https://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.563. 9990). doi:10.1103/RevModPhys.80.1061 (https://doi.org/10.1103%2FRevModPhys.80.106 1). S2CID 14255125 (https://api.semanticscholar.org/CorpusID:14255125). 40. Nayak, Chetan; Simon, Steven; Stern, Ady; Das Sarma, Sankar (2008). \"Nonabelian Anyons and Quantum Computation\". Reviews of Modern Physics. 80 (3): 1083–1159. arXiv:0707.1889 (https://arxiv.org/abs/0707.1889). Bibcode:2008RvMP...80.1083N (https://u i.adsabs.harvard.edu/abs/2008RvMP...80.1083N). doi:10.1103/RevModPhys.80.1083 (http s://doi.org/10.1103%2FRevModPhys.80.1083). S2CID 119628297 (https://api.semanticscho lar.org/CorpusID:119628297). 41. Chi-Chih Yao, A. (1993). \"Quantum circuit complexity\" (https://ieeexplore.ieee.org/document/ 366852). Proceedings of 1993 IEEE 34th Annual Foundations of Computer Science. pp. 352–361. doi:10.1109/SFCS.1993.366852 (https://doi.org/10.1109%2FSFCS.1993.3668 52). ISBN 0-8186-4370-6. S2CID 195866146 (https://api.semanticscholar.org/CorpusID:195 866146). 42. Raussendorf, Robert; Browne, Daniel E.; Briegel, Hans J. (25 August 2003). \"Measurement- based quantum computation on cluster states\". Physical Review A. 68 (2): 022312. arXiv:quant-ph/0301052 (https://arxiv.org/abs/quant-ph/0301052).",
                "umap_x": 2.7057130336761475,
                "umap_y": 0.6519444584846497,
                "color": "#BCBD22"
            },
            {
                "text": "Bibcode:2003PhRvA..68b2312R (https://ui.adsabs.harvard.edu/abs/2003PhRvA..68b2312",
                "umap_x": 5.698537349700928,
                "umap_y": 6.119311332702637,
                "color": "#BCBD22"
            },
            {
                "text": "R). doi:10.1103/PhysRevA.68.022312 (https://doi.org/10.1103%2FPhysRevA.68.022312).",
                "umap_x": 5.142773151397705,
                "umap_y": 5.332974910736084,
                "color": "#BCBD22"
            },
            {
                "text": "S2CID 6197709 (https://api.semanticscholar.org/CorpusID:6197709). 43. Aharonov, Dorit; van Dam, Wim; Kempe, Julia; Landau, Zeph; Lloyd, Seth; Regev, Oded (1",
                "umap_x": 7.023362636566162,
                "umap_y": 3.831662654876709,
                "color": "#BCBD22"
            },
            {
                "text": "January 2008). \"Adiabatic Quantum Computation Is Equivalent to Standard Quantum",
                "umap_x": 1.8031907081604004,
                "umap_y": 1.6007914543151855,
                "color": "#BCBD22"
            },
            {
                "text": "Computation\". SIAM Review. 50 (4): 755–787. arXiv:quant-ph/0405098 (https://arxiv.org/ab s/quant-ph/0405098). Bibcode:2008SIAMR..50..755A (https://ui.adsabs.harvard.edu/abs/20 08SIAMR..50..755A). doi:10.1137/080734479 (https://doi.org/10.1137%2F080734479).",
                "umap_x": 3.459876537322998,
                "umap_y": 1.9194337129592896,
                "color": "#BCBD22"
            },
            {
                "text": "ISSN 0036-1445 (https://search.worldcat.org/issn/0036-1445). S2CID 1503123 (https://api.s emanticscholar.org/CorpusID:1503123). 44. Freedman, Michael H.; Larsen, Michael; Wang, Zhenghan (1 June 2002). \"A Modular",
                "umap_x": 6.525629997253418,
                "umap_y": 3.781298875808716,
                "color": "#BCBD22"
            },
            {
                "text": "Functor Which is Universal for Quantum Computation\". Communications in Mathematical",
                "umap_x": 4.553631782531738,
                "umap_y": 0.3065464496612549,
                "color": "#BCBD22"
            },
            {
                "text": "Physics. 227 (3): 605–622. arXiv:quant-ph/0001108 (https://arxiv.org/abs/quant-ph/000110 8). Bibcode:2002CMaPh.227..605F (https://ui.adsabs.harvard.edu/abs/2002CMaPh.227..60 5F). doi:10.1007/s002200200645 (https://doi.org/10.1007%2Fs002200200645). ISSN 0010- 3616 (https://search.worldcat.org/issn/0010-3616). S2CID 8990600 (https://api.semanticsch olar.org/CorpusID:8990600). 45. Nielsen & Chuang 2010, p. 481. 46. Preskill, John (6 August 2018). \"Quantum Computing in the NISQ era and beyond\" (https://d oi.org/10.22331%2Fq-2018-08-06-79). Quantum. 2: 79. arXiv:1801.00862 (https://arxiv.org/ abs/1801.00862). Bibcode:2018Quant...2...79P (https://ui.adsabs.harvard.edu/abs/2018Qua nt...2...79P). doi:10.22331/q-2018-08-06-79 (https://doi.org/10.22331%2Fq-2018-08-06-79).",
                "umap_x": 2.779869318008423,
                "umap_y": 0.8006380200386047,
                "color": "#BCBD22"
            },
            {
                "text": "S2CID 44098998 (https://api.semanticscholar.org/CorpusID:44098998). 47. Bluvstein, Dolev; Evered, Simon J.; Geim, Alexandra A.; Li, Sophie H.; Zhou, Hengyun;",
                "umap_x": 6.935245513916016,
                "umap_y": 3.902846097946167,
                "color": "#BCBD22"
            },
            {
                "text": "Manovitz, Tom; Ebadi, Sepehr; Cain, Madelyn; Kalinowski, Marcin; Hangleiter, Dominik;",
                "umap_x": 7.560337066650391,
                "umap_y": 3.7552754878997803,
                "color": "#BCBD22"
            },
            {
                "text": "Ataides, J. Pablo Bonilla; Maskara, Nishad; Cong, Iris; Gao, Xun; Rodriguez, Pedro Sales (6",
                "umap_x": 7.584568023681641,
                "umap_y": 3.864290475845337,
                "color": "#BCBD22"
            },
            {
                "text": "December 2023). \"Logical quantum processor based on reconfigurable atom arrays\" (http s://www.ncbi.nlm.nih.gov/pmc/articles/PMC10830422). Nature. 626 (7997): 58–65. arXiv:2312.03982 (https://arxiv.org/abs/2312.03982). doi:10.1038/s41586-023-06927-3 (http s://doi.org/10.1038%2Fs41586-023-06927-3). ISSN 1476-4687 (https://search.worldcat.org/i ssn/1476-4687). PMC 10830422 (https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1083042 2). PMID 38056497 (https://pubmed.ncbi.nlm.nih.gov/38056497). S2CID 266052773 (http s://api.semanticscholar.org/CorpusID:266052773). 48. Freedberg Jr., Sydney J. (7 December 2023). \" 'Off to the races': DARPA, Harvard breakthrough brings quantum computing years closer\" (https://breakingdefense.sites.breaki ngmedia.com/2023/12/off-to-the-races-darpa-harvard-breakthrough-brings-quantum-comput ing-years-closer/). Breaking Defense. Retrieved 9 December 2023. 49. \"DARPA-Funded Research Leads to Quantum Computing Breakthrough\" (https://www.darp a.mil/news-events/2023-12-06). darpa.mil. 6 December 2023. Retrieved 5 January 2024. 50. Choudhury, Rizwan (30 December 2023). \"Top 7 innovation stories of 2023 – Interesting",
                "umap_x": 2.964460611343384,
                "umap_y": 0.5210072994232178,
                "color": "#BCBD22"
            },
            {
                "text": "Engineering\" (https://interestingengineering.com/lists/top-7-innovation-stories-of-2023-intere sting-engineering). interestingengineering.com. Retrieved 6 January 2024. 51. Pirandola, S.; Andersen, U. L.; Banchi, L.; Berta, M.; Bunandar, D.; Colbeck, R.; Englund,",
                "umap_x": 5.349109649658203,
                "umap_y": 3.5258662700653076,
                "color": "#BCBD22"
            },
            {
                "text": "D.; Gehring, T.; Lupo, C.; Ottaviani, C.; Pereira, J.; Razavi, M.; Shamsul Shaari, J.;",
                "umap_x": 7.5287861824035645,
                "umap_y": 3.8064630031585693,
                "color": "#BCBD22"
            },
            {
                "text": "Tomamichel, M.; Usenko, V. C.; Vallone, G.; Villoresi, P.; Wallden, P. (2020). \"Advances in quantum cryptography\". Advances in Optics and Photonics. 12 (4): 1012–1236. arXiv:1906.01645 (https://arxiv.org/abs/1906.01645). Bibcode:2020AdOP...12.1012P (http s://ui.adsabs.harvard.edu/abs/2020AdOP...12.1012P). doi:10.1364/AOP.361502 (https://doi. org/10.1364%2FAOP.361502). 52. Pirandola, S.; Andersen, U. L.; Banchi, L.; Berta, M.; Bunandar, D.; Colbeck, R.; Englund,",
                "umap_x": 2.8133704662323,
                "umap_y": 2.433044910430908,
                "color": "#BCBD22"
            },
            {
                "text": "D.; Gehring, T.; Lupo, C.; Ottaviani, C.; Pereira, J. L.; Razavi, M.; Shamsul Shaari, J.;",
                "umap_x": 7.604698657989502,
                "umap_y": 3.9050159454345703,
                "color": "#BCBD22"
            },
            {
                "text": "Tomamichel, M.; Usenko, V. C. (14 December 2020). \"Advances in quantum cryptography\".",
                "umap_x": 2.9129459857940674,
                "umap_y": 2.4758851528167725,
                "color": "#BCBD22"
            },
            {
                "text": "Advances in Optics and Photonics. 12 (4): 1017. arXiv:1906.01645 (https://arxiv.org/abs/190 6.01645). Bibcode:2020AdOP...12.1012P (https://ui.adsabs.harvard.edu/abs/2020AdOP...1 2.1012P). doi:10.1364/AOP.361502 (https://doi.org/10.1364%2FAOP.361502). ISSN 1943- 8206 (https://search.worldcat.org/issn/1943-8206). S2CID 174799187 (https://api.semantics cholar.org/CorpusID:174799187). 53. Xu, Feihu; Ma, Xiongfeng; Zhang, Qiang; Lo, Hoi-Kwong; Pan, Jian-Wei (26 May 2020). \"Secure quantum key distribution with realistic devices\". Reviews of Modern Physics. 92 (2): 025002-3. arXiv:1903.09051 (https://arxiv.org/abs/1903.09051).",
                "umap_x": 2.6528563499450684,
                "umap_y": 2.4411473274230957,
                "color": "#BCBD22"
            },
            {
                "text": "Bibcode:2020RvMP...92b5002X (https://ui.adsabs.harvard.edu/abs/2020RvMP...92b5002X). doi:10.1103/RevModPhys.92.025002 (https://doi.org/10.1103%2FRevModPhys.92.025002).",
                "umap_x": 5.573042392730713,
                "umap_y": 5.998349189758301,
                "color": "#BCBD22"
            },
            {
                "text": "S2CID 210942877 (https://api.semanticscholar.org/CorpusID:210942877). 54. Xu, Guobin; Mao, Jianzhou; Sakk, Eric; Wang, Shuangbao Paul (22 March 2023). \"An",
                "umap_x": 6.658659934997559,
                "umap_y": 3.7451207637786865,
                "color": "#BCBD22"
            },
            {
                "text": "Overview of Quantum-Safe Approaches: Quantum Key Distribution and Post-Quantum",
                "umap_x": 2.413862705230713,
                "umap_y": 2.6608498096466064,
                "color": "#BCBD22"
            },
            {
                "text": "Cryptography\". 2023 57th Annual Conference on Information Sciences and Systems (CISS).",
                "umap_x": 3.226945161819458,
                "umap_y": 2.5938072204589844,
                "color": "#BCBD22"
            },
            {
                "text": "IEEE. p. 3. doi:10.1109/CISS56502.2023.10089619 (https://doi.org/10.1109%2FCISS5650 2.2023.10089619). ISBN 978-1-6654-5181-9. 55. Kozlowski, Wojciech; Wehner, Stephanie (25 September 2019). \"Towards Large-Scale",
                "umap_x": 5.04667329788208,
                "umap_y": 2.474977731704712,
                "color": "#BCBD22"
            },
            {
                "text": "Quantum Networks\". Proceedings of the Sixth Annual ACM International Conference on",
                "umap_x": 4.582871913909912,
                "umap_y": 0.5538485050201416,
                "color": "#BCBD22"
            },
            {
                "text": "Nanoscale Computing and Communication. ACM. pp. 1–7. arXiv:1909.08396 (https://arxiv.or g/abs/1909.08396). doi:10.1145/3345312.3345497 (https://doi.org/10.1145%2F3345312.33 45497). ISBN 978-1-4503-6897-1. 56. Guo, Xueshi; Breum, Casper R.; Borregaard, Johannes; Izumi, Shuro; Larsen, Mikkel V.;",
                "umap_x": 4.378410339355469,
                "umap_y": 1.0769448280334473,
                "color": "#BCBD22"
            },
            {
                "text": "Gehring, Tobias; Christandl, Matthias; Neergaard-Nielsen, Jonas S.; Andersen, Ulrik L. (23",
                "umap_x": 7.499838352203369,
                "umap_y": 3.7883074283599854,
                "color": "#BCBD22"
            },
            {
                "text": "December 2019). \"Distributed quantum sensing in a continuous-variable entangled network\". Nature Physics. 16 (3): 281–284. arXiv:1905.09408 (https://arxiv.org/abs/1905.09 408). doi:10.1038/s41567-019-0743-x (https://doi.org/10.1038%2Fs41567-019-0743-x).",
                "umap_x": 4.153630256652832,
                "umap_y": 1.5187737941741943,
                "color": "#BCBD22"
            },
            {
                "text": "ISSN 1745-2473 (https://search.worldcat.org/issn/1745-2473). S2CID 256703226 (https://ap i.semanticscholar.org/CorpusID:256703226). 57. Jordan, Stephen (14 October 2022) [22 April 2011]. \"Quantum Algorithm Zoo\" (http://math.ni st.gov/quantum/zoo/). Archived (https://web.archive.org/web/20180429014516/https://math. nist.gov/quantum/zoo/) from the original on 29 April 2018. 58. Aaronson, Scott; Arkhipov, Alex (6 June 2011). \"The computational complexity of linear optics\". Proceedings of the forty-third annual ACM symposium on Theory of computing. San",
                "umap_x": 4.13658332824707,
                "umap_y": 1.4885939359664917,
                "color": "#BCBD22"
            },
            {
                "text": "Jose, California: Association for Computing Machinery. pp. 333–342. arXiv:1011.3245 (http s://arxiv.org/abs/1011.3245). doi:10.1145/1993636.1993682 (https://doi.org/10.1145%2F199 3636.1993682). ISBN 978-1-4503-0691-1. 59. Nielsen & Chuang 2010, p. 42. 60. Norton, Quinn (15 February 2007). \"The Father of Quantum Computing\" (http://archive.wire d.com/science/discoveries/news/2007/02/72734). Wired. 61. Ambainis, Andris (Spring 2014). \"What Can We Do with a Quantum Computer?\" (http://www. ias.edu/ias-letter/ambainis-quantum-computing). Institute for Advanced Study. 62. Chang, Kenneth (14 June 2023). \"Quantum Computing Advance Begins New Era, IBM Says – A quantum computer came up with better answers to a physics problem than a conventional supercomputer\" (https://www.nytimes.com/2023/06/14/science/ibm-quantum-c omputing.html). The New York Times. Archived (https://archive.today/20230614151835/http s://www.nytimes.com/2023/06/14/science/ibm-quantum-computing.html) from the original on 14 June 2023. Retrieved 15 June 2023. 63. Kim, Youngseok; et al. (14 June 2023). \"Evidence for the utility of quantum computing before fault tolerance\" (https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10266970). Nature. 618 (7965): 500–505. Bibcode:2023Natur.618..500K (https://ui.adsabs.harvard.edu/abs/202 3Natur.618..500K). doi:10.1038/s41586-023-06096-3 (https://doi.org/10.1038%2Fs41586-02 3-06096-3). PMC 10266970 (https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10266970).",
                "umap_x": 1.1918443441390991,
                "umap_y": 1.2236967086791992,
                "color": "#BCBD22"
            },
            {
                "text": "PMID 37316724 (https://pubmed.ncbi.nlm.nih.gov/37316724). 64. Morello, Andrea (21 November 2018). Lunch & Learn: Quantum Computing (https://web.arc hive.org/web/20210215140237/https://www.youtube.com/watch?v=7susESgnDv8). Sibos",
                "umap_x": 3.3443078994750977,
                "umap_y": -0.2664619982242584,
                "color": "#BCBD22"
            },
            {
                "text": "TV. Archived from the original on 15 February 2021. Retrieved 4 February 2021 – via",
                "umap_x": 6.826744079589844,
                "umap_y": 2.909919261932373,
                "color": "#BCBD22"
            },
            {
                "text": "YouTube. 65. Ruane, Jonathan; McAfee, Andrew; Oliver, William D. (1 January 2022). \"Quantum",
                "umap_x": 5.500120162963867,
                "umap_y": 1.182956576347351,
                "color": "#BCBD22"
            },
            {
                "text": "Computing for Business Leaders\" (https://hbr.org/2022/01/quantum-computing-for-business- leaders). Harvard Business Review. ISSN 0017-8012 (https://search.worldcat.org/issn/0017- 8012). Retrieved 12 April 2023. 66. Budde, Florian; Volz, Daniel (12 July 2019). \"Quantum computing and the chemical industry | McKinsey\" (https://www.mckinsey.com/industries/chemicals/our-insights/the-next-big-thing- quantum-computings-potential-impact-on-chemicals). www.mckinsey.com. McKinsey and",
                "umap_x": 3.2131166458129883,
                "umap_y": 0.17591014504432678,
                "color": "#BCBD22"
            },
            {
                "text": "Company. Retrieved 12 April 2023. 67. Bourzac, Katherine (30 October 2017). \"Chemistry is quantum computing's killer app\" (http s://cen.acs.org/articles/95/i43/Chemistry-quantum-computings-killer-app.html). cen.acs.org.",
                "umap_x": 3.4382193088531494,
                "umap_y": 0.1917767971754074,
                "color": "#BCBD22"
            },
            {
                "text": "American Chemical Society. Retrieved 12 April 2023. 68. Lenstra, Arjen K. (2000). \"Integer Factoring\" (https://web.archive.org/web/20150410234239/ http://sage.math.washington.edu/edu/124/misc/arjen_lenstra_factoring.pdf) (PDF). Designs,",
                "umap_x": 4.149916648864746,
                "umap_y": 2.610668659210205,
                "color": "#BCBD22"
            },
            {
                "text": "Codes and Cryptography. 19 (2/3): 101–128. doi:10.1023/A:1008397921377 (https://doi.org/ 10.1023%2FA%3A1008397921377). S2CID 9816153 (https://api.semanticscholar.org/Corpu sID:9816153). Archived from the original (http://sage.math.washington.edu/edu/124/misc/arj en_lenstra_factoring.pdf) (PDF) on 10 April 2015. 69. Nielsen & Chuang 2010, p. 216. 70. Bernstein, Daniel J. (2009). \"Introduction to post-quantum cryptography\". Post-Quantum",
                "umap_x": 3.3916752338409424,
                "umap_y": 2.4344701766967773,
                "color": "#BCBD22"
            },
            {
                "text": "Cryptography. Berlin, Heidelberg: Springer. pp. 1–14. doi:10.1007/978-3-540-88702-7_1 (htt ps://doi.org/10.1007%2F978-3-540-88702-7_1). ISBN 978-3-540-88701-0.",
                "umap_x": 3.4498064517974854,
                "umap_y": 2.653940439224243,
                "color": "#BCBD22"
            },
            {
                "text": "S2CID 61401925 (https://api.semanticscholar.org/CorpusID:61401925). 71. See also pqcrypto.org (http://pqcrypto.org/), a bibliography maintained by Daniel J.",
                "umap_x": 6.721907138824463,
                "umap_y": 3.8157687187194824,
                "color": "#BCBD22"
            },
            {
                "text": "Bernstein and Tanja Lange on cryptography not known to be broken by quantum computing. 72. McEliece, R. J. (January 1978). \"A Public-Key Cryptosystem Based On Algebraic Coding",
                "umap_x": 2.9714715480804443,
                "umap_y": 2.5026228427886963,
                "color": "#BCBD22"
            },
            {
                "text": "Theory\" (https://ipnpr.jpl.nasa.gov/progress_report2/42-44/44N.PDF) (PDF). DSNPR. 44: 114–116. Bibcode:1978DSNPR..44..114M (https://ui.adsabs.harvard.edu/abs/1978DSNPR.. 44..114M). 73. Kobayashi, H.; Gall, F. L. (2006). \"Dihedral Hidden Subgroup Problem: A Survey\" (https://do i.org/10.2197%2Fipsjdc.1.470). Information and Media Technologies. 1 (1): 178–185. doi:10.2197/ipsjdc.1.470 (https://doi.org/10.2197%2Fipsjdc.1.470). 74. Bennett, Charles H.; Bernstein, Ethan; Brassard, Gilles; Vazirani, Umesh (October 1997). \"Strengths and Weaknesses of Quantum Computing\". SIAM Journal on Computing. 26 (5): 1510–1523. arXiv:quant-ph/9701001 (https://arxiv.org/abs/quant-ph/9701001).",
                "umap_x": 2.8197784423828125,
                "umap_y": 1.2166447639465332,
                "color": "#BCBD22"
            },
            {
                "text": "Bibcode:1997quant.ph..1001B (https://ui.adsabs.harvard.edu/abs/1997quant.ph..1001B). doi:10.1137/s0097539796300933 (https://doi.org/10.1137%2Fs0097539796300933).",
                "umap_x": 5.579909801483154,
                "umap_y": 5.917635917663574,
                "color": "#BCBD22"
            },
            {
                "text": "S2CID 13403194 (https://api.semanticscholar.org/CorpusID:13403194). 75. Brassard, Gilles; Høyer, Peter; Tapp, Alain (2016). \"Quantum Algorithm for the Collision",
                "umap_x": 3.810539722442627,
                "umap_y": 0.9542607069015503,
                "color": "#BCBD22"
            },
            {
                "text": "Problem\". In Kao, Ming-Yang (ed.). Encyclopedia of Algorithms. New York, New York:",
                "umap_x": 4.150057315826416,
                "umap_y": 1.9685492515563965,
                "color": "#BCBD22"
            },
            {
                "text": "Springer. pp. 1662–1664. arXiv:quant-ph/9705002 (https://arxiv.org/abs/quant-ph/9705002). doi:10.1007/978-1-4939-2864-4_304 (https://doi.org/10.1007%2F978-1-4939-2864-4_304).",
                "umap_x": 5.4845428466796875,
                "umap_y": 4.979944705963135,
                "color": "#BCBD22"
            },
            {
                "text": "ISBN 978-1-4939-2864-4. S2CID 3116149 (https://api.semanticscholar.org/CorpusID:31161 49). 76. Farhi, Edward; Goldstone, Jeffrey; Gutmann, Sam (23 December 2008). \"A Quantum",
                "umap_x": 5.163839340209961,
                "umap_y": 1.37490713596344,
                "color": "#BCBD22"
            },
            {
                "text": "Algorithm for the Hamiltonian NAND Tree\" (https://doi.org/10.4086%2Ftoc.2008.v004a008).",
                "umap_x": 3.9213995933532715,
                "umap_y": 1.9202810525894165,
                "color": "#BCBD22"
            },
            {
                "text": "Theory of Computing. 4 (1): 169–190. doi:10.4086/toc.2008.v004a008 (https://doi.org/10.40 86%2Ftoc.2008.v004a008). ISSN 1557-2862 (https://search.worldcat.org/issn/1557-2862).",
                "umap_x": 4.638283729553223,
                "umap_y": 1.850588321685791,
                "color": "#BCBD22"
            },
            {
                "text": "S2CID 8258191 (https://api.semanticscholar.org/CorpusID:8258191). 77. Williams, Colin P. (2011). Explorations in Quantum Computing. Springer. pp. 242–244.",
                "umap_x": 3.912984609603882,
                "umap_y": 0.8451170325279236,
                "color": "#BCBD22"
            },
            {
                "text": "ISBN 978-1-84628-887-6. 78. Grover, Lov (29 May 1996). \"A fast quantum mechanical algorithm for database search\". arXiv:quant-ph/9605043 (https://arxiv.org/abs/quant-ph/9605043). 79. Ambainis, Ambainis (June 2004). \"Quantum search algorithms\". ACM SIGACT News. 35 (2): 22–35. arXiv:quant-ph/0504012 (https://arxiv.org/abs/quant-ph/0504012).",
                "umap_x": 3.505251407623291,
                "umap_y": 1.743097186088562,
                "color": "#BCBD22"
            },
            {
                "text": "Bibcode:2005quant.ph..4012A (https://ui.adsabs.harvard.edu/abs/2005quant.ph..4012A). doi:10.1145/992287.992296 (https://doi.org/10.1145%2F992287.992296). S2CID 11326499 (https://api.semanticscholar.org/CorpusID:11326499). 80. Rich, Steven; Gellman, Barton (1 February 2014). \"NSA seeks to build quantum computer that could crack most types of encryption\" (https://www.washingtonpost.com/world/national- security/nsa-seeks-to-build-quantum-computer-that-could-crack-most-types-of-encryption/20 14/01/02/8fff297e-7195-11e3-8def-a33011492df2_story.html). The Washington Post. 81. Outeiral, Carlos; Strahm, Martin; Morris, Garrett; Benjamin, Simon; Deane, Charlotte; Shi,",
                "umap_x": 2.9838504791259766,
                "umap_y": 0.70289146900177,
                "color": "#BCBD22"
            },
            {
                "text": "Jiye (2021). \"The prospects of quantum computing in computational molecular biology\" (http s://doi.org/10.1002%2Fwcms.1481). WIREs Computational Molecular Science. 11. arXiv:2005.12792 (https://arxiv.org/abs/2005.12792). doi:10.1002/wcms.1481 (https://doi.or g/10.1002%2Fwcms.1481). S2CID 218889377 (https://api.semanticscholar.org/CorpusID:21 8889377). 82. Biamonte, Jacob; Wittek, Peter; Pancotti, Nicola; Rebentrost, Patrick; Wiebe, Nathan; Lloyd,",
                "umap_x": 3.010204315185547,
                "umap_y": 0.8307138085365295,
                "color": "#BCBD22"
            },
            {
                "text": "Seth (September 2017). \"Quantum machine learning\". Nature. 549 (7671): 195–202. arXiv:1611.09347 (https://arxiv.org/abs/1611.09347). Bibcode:2017Natur.549..195B (https:// ui.adsabs.harvard.edu/abs/2017Natur.549..195B). doi:10.1038/nature23474 (https://doi.org/ 10.1038%2Fnature23474). ISSN 0028-0836 (https://search.worldcat.org/issn/0028-0836).",
                "umap_x": 3.3177247047424316,
                "umap_y": 1.3633801937103271,
                "color": "#BCBD22"
            },
            {
                "text": "PMID 28905917 (https://pubmed.ncbi.nlm.nih.gov/28905917). S2CID 64536201 (https://api. semanticscholar.org/CorpusID:64536201). 83. Harrow, Aram; Hassidim, Avinatan; Lloyd, Seth (2009). \"Quantum algorithm for solving linear systems of equations\". Physical Review Letters. 103 (15): 150502. arXiv:0811.3171 (https:// arxiv.org/abs/0811.3171). Bibcode:2009PhRvL.103o0502H (https://ui.adsabs.harvard.edu/a bs/2009PhRvL.103o0502H). doi:10.1103/PhysRevLett.103.150502 (https://doi.org/10.110 3%2FPhysRevLett.103.150502). PMID 19905613 (https://pubmed.ncbi.nlm.nih.gov/199056 13). S2CID 5187993 (https://api.semanticscholar.org/CorpusID:5187993). 84. Benedetti, Marcello; Realpe-Gómez, John; Biswas, Rupak; Perdomo-Ortiz, Alejandro (9",
                "umap_x": 3.64001202583313,
                "umap_y": 1.4477931261062622,
                "color": "#BCBD22"
            },
            {
                "text": "August 2016). \"Estimation of effective temperatures in quantum annealers for sampling applications: A case study with possible applications in deep learning\" (https://doi.org/10.110 3%2FPhysRevA.94.022308). Physical Review A. 94 (2): 022308. arXiv:1510.07611 (https:// arxiv.org/abs/1510.07611). Bibcode:2016PhRvA..94b2308B (https://ui.adsabs.harvard.edu/a bs/2016PhRvA..94b2308B). doi:10.1103/PhysRevA.94.022308 (https://doi.org/10.1103%2F",
                "umap_x": 3.0509986877441406,
                "umap_y": 1.393751621246338,
                "color": "#BCBD22"
            },
            {
                "text": "PhysRevA.94.022308). 85. Ajagekar, Akshay; You, Fengqi (5 December 2020). \"Quantum computing assisted deep learning for fault detection and diagnosis in industrial process systems\". Computers &",
                "umap_x": 2.985344409942627,
                "umap_y": 1.4550753831863403,
                "color": "#BCBD22"
            },
            {
                "text": "Chemical Engineering. 143: 107119. arXiv:2003.00264 (https://arxiv.org/abs/2003.00264). doi:10.1016/j.compchemeng.2020.107119 (https://doi.org/10.1016%2Fj.compchemeng.202 0.107119). ISSN 0098-1354 (https://search.worldcat.org/issn/0098-1354).",
                "umap_x": 5.2499542236328125,
                "umap_y": 3.8487253189086914,
                "color": "#BCBD22"
            },
            {
                "text": "S2CID 211678230 (https://api.semanticscholar.org/CorpusID:211678230). 86. Ajagekar, Akshay; You, Fengqi (1 December 2021). \"Quantum computing based hybrid deep learning for fault diagnosis in electrical power systems\" (https://doi.org/10.1016%2Fj.apener gy.2021.117628). Applied Energy. 303: 117628. Bibcode:2021ApEn..30317628A (https://ui. adsabs.harvard.edu/abs/2021ApEn..30317628A). doi:10.1016/j.apenergy.2021.117628 (http s://doi.org/10.1016%2Fj.apenergy.2021.117628). ISSN 0306-2619 (https://search.worldcat.o rg/issn/0306-2619). 87. Gao, Xun; Anschuetz, Eric R.; Wang, Sheng-Tao; Cirac, J. Ignacio; Lukin, Mikhail D. (2022). \"Enhancing Generative Models via Quantum Correlations\". Physical Review X. 12 (2): 021037. arXiv:2101.08354 (https://arxiv.org/abs/2101.08354).",
                "umap_x": 3.06315016746521,
                "umap_y": 1.479472041130066,
                "color": "#BCBD22"
            },
            {
                "text": "Bibcode:2022PhRvX..12b1037G (https://ui.adsabs.harvard.edu/abs/2022PhRvX..12b1037",
                "umap_x": 5.69815731048584,
                "umap_y": 6.1617560386657715,
                "color": "#BCBD22"
            },
            {
                "text": "G). doi:10.1103/PhysRevX.12.021037 (https://doi.org/10.1103%2FPhysRevX.12.021037).",
                "umap_x": 5.049775123596191,
                "umap_y": 5.30603551864624,
                "color": "#BCBD22"
            },
            {
                "text": "S2CID 231662294 (https://api.semanticscholar.org/CorpusID:231662294). 88. Li, Junde; Topaloglu, Rasit; Ghosh, Swaroop (9 January 2021). \"Quantum Generative",
                "umap_x": 3.6346373558044434,
                "umap_y": 0.975944995880127,
                "color": "#BCBD22"
            },
            {
                "text": "Models for Small Molecule Drug Discovery\". arXiv:2101.03438 (https://arxiv.org/abs/2101.03 438) [cs.ET (https://arxiv.org/archive/cs.ET)]. 89. Brooks, Michael (24 May 2023). \"Quantum computers: what are they good for?\" (https://doi. org/10.1038%2Fd41586-023-01692-9). Nature. 617 (7962): S1 – S3.",
                "umap_x": 2.582441568374634,
                "umap_y": 0.8663572072982788,
                "color": "#BCBD22"
            },
            {
                "text": "Bibcode:2023Natur.617S...1B (https://ui.adsabs.harvard.edu/abs/2023Natur.617S...1B). doi:10.1038/d41586-023-01692-9 (https://doi.org/10.1038%2Fd41586-023-01692-9).",
                "umap_x": 5.642522811889648,
                "umap_y": 5.818332195281982,
                "color": "#BCBD22"
            },
            {
                "text": "PMID 37225885 (https://pubmed.ncbi.nlm.nih.gov/37225885). S2CID 258847001 (https://ap i.semanticscholar.org/CorpusID:258847001). 90. Torsten Hoefler; Thomas Häner; Matthias Troyer (May 2023). \"Disentangling Hype from",
                "umap_x": 6.14192533493042,
                "umap_y": 4.187107086181641,
                "color": "#BCBD22"
            },
            {
                "text": "Practicality: On Realistically Achieving Quantum Advantage\" (https://m-cacm.acm.org/maga zines/2023/5/272276-disentangling-hype-from-practicality-on-realistically-achieving-quantu m-advantage/fulltext). Communications of the ACM. 91. Dyakonov, Mikhail (15 November 2018). \"The Case Against Quantum Computing\" (https://sp ectrum.ieee.org/the-case-against-quantum-computing). IEEE Spectrum. 92. DiVincenzo, David P. (13 April 2000). \"The Physical Implementation of Quantum",
                "umap_x": 2.9862160682678223,
                "umap_y": -0.31113702058792114,
                "color": "#BCBD22"
            },
            {
                "text": "Computation\". Fortschritte der Physik. 48 (9–11): 771–783. arXiv:quant-ph/0002077 (https:// arxiv.org/abs/quant-ph/0002077). Bibcode:2000ForPh..48..771D (https://ui.adsabs.harvard.e du/abs/2000ForPh..48..771D). doi:10.1002/1521-3978(200009)48:9/11<771::AID-",
                "umap_x": 4.748555660247803,
                "umap_y": 5.221406936645508,
                "color": "#BCBD22"
            },
            {
                "text": "PROP771>3.0.CO;2-E (https://doi.org/10.1002%2F1521-3978%28200009%2948%3A9%2F 11%3C771%3A%3AAID-PROP771%3E3.0.CO%3B2-E). S2CID 15439711 (https://api.sem anticscholar.org/CorpusID:15439711). 93. Giles, Martin (17 January 2019). \"We'd have more quantum computers if it weren't so hard to find the damn cables\" (https://www.technologyreview.com/s/612760/quantum-computers- component-shortage/). MIT Technology Review. Retrieved 17 May 2021. 94. Pauka SJ, Das K, Kalra B, Moini A, Yang Y, Trainer M, Bousquet A, Cantaloube C, Dick N,",
                "umap_x": 2.811922550201416,
                "umap_y": 0.21126289665699005,
                "color": "#BCBD22"
            },
            {
                "text": "Gardner GC, Manfra MJ, Reilly DJ (2021). \"A cryogenic CMOS chip for generating control signals for multiple qubits\" (https://www.nature.com/articles/s41928-020-00528-y). Nature",
                "umap_x": 0.21335916221141815,
                "umap_y": 0.22901961207389832,
                "color": "#BCBD22"
            },
            {
                "text": "Electronics. 4 (4): 64–70. arXiv:1912.01299 (https://arxiv.org/abs/1912.01299). doi:10.1038/s41928-020-00528-y (https://doi.org/10.1038%2Fs41928-020-00528-y).",
                "umap_x": 4.954287528991699,
                "umap_y": 4.956923484802246,
                "color": "#BCBD22"
            },
            {
                "text": "S2CID 231715555 (https://api.semanticscholar.org/CorpusID:231715555). 95. DiVincenzo, David P. (1995). \"Quantum Computation\". Science. 270 (5234): 255–261.",
                "umap_x": 3.542586326599121,
                "umap_y": 0.7991429567337036,
                "color": "#BCBD22"
            },
            {
                "text": "Bibcode:1995Sci...270..255D (https://ui.adsabs.harvard.edu/abs/1995Sci...270..255D).",
                "umap_x": 5.725135326385498,
                "umap_y": 6.214089393615723,
                "color": "#BCBD22"
            },
            {
                "text": "CiteSeerX 10.1.1.242.2165 (https://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.242. 2165). doi:10.1126/science.270.5234.255 (https://doi.org/10.1126%2Fscience.270.5234.25 5). S2CID 220110562 (https://api.semanticscholar.org/CorpusID:220110562). 96. Zu, H.; Dai, W.; de Waele, A.T.A.M. (2022). \"Development of Dilution refrigerators – A review\". Cryogenics. 121. doi:10.1016/j.cryogenics.2021.103390 (https://doi.org/10.1016%2",
                "umap_x": 5.3610663414001465,
                "umap_y": 4.543390274047852,
                "color": "#BCBD22"
            },
            {
                "text": "Fj.cryogenics.2021.103390). ISSN 0011-2275 (https://search.worldcat.org/issn/0011-2275).",
                "umap_x": 5.232124328613281,
                "umap_y": 4.400749206542969,
                "color": "#BCBD22"
            },
            {
                "text": "S2CID 244005391 (https://api.semanticscholar.org/CorpusID:244005391). 97. Jones, Nicola (19 June 2013). \"Computing: The quantum company\" (https://doi.org/10.103 8%2F498286a). Nature. 498 (7454): 286–288. Bibcode:2013Natur.498..286J (https://ui.adsa bs.harvard.edu/abs/2013Natur.498..286J). doi:10.1038/498286a (https://doi.org/10.1038%2",
                "umap_x": 3.1738035678863525,
                "umap_y": 0.5785737633705139,
                "color": "#BCBD22"
            },
            {
                "text": "F498286a). PMID 23783610 (https://pubmed.ncbi.nlm.nih.gov/23783610). 98. Vepsäläinen, Antti P.; Karamlou, Amir H.; Orrell, John L.; Dogra, Akshunna S.; Loer, Ben; et al. (August 2020). \"Impact of ionizing radiation on superconducting qubit coherence\" (http s://www.nature.com/articles/s41586-020-2619-8). Nature. 584 (7822): 551–556. arXiv:2001.09190 (https://arxiv.org/abs/2001.09190). Bibcode:2020Natur.584..551V (https:// ui.adsabs.harvard.edu/abs/2020Natur.584..551V). doi:10.1038/s41586-020-2619-8 (https://d oi.org/10.1038%2Fs41586-020-2619-8). ISSN 1476-4687 (https://search.worldcat.org/issn/1 476-4687). PMID 32848227 (https://pubmed.ncbi.nlm.nih.gov/32848227).",
                "umap_x": 1.341240406036377,
                "umap_y": -0.20429764688014984,
                "color": "#BCBD22"
            },
            {
                "text": "S2CID 210920566 (https://api.semanticscholar.org/CorpusID:210920566). 99. Amy, Matthew; Matteo, Olivia; Gheorghiu, Vlad; Mosca, Michele; Parent, Alex; Schanck,",
                "umap_x": 7.099807262420654,
                "umap_y": 3.7366557121276855,
                "color": "#BCBD22"
            },
            {
                "text": "John (30 November 2016). \"Estimating the cost of generic quantum pre-image attacks on",
                "umap_x": 3.0784034729003906,
                "umap_y": 2.347230911254883,
                "color": "#BCBD22"
            },
            {
                "text": "SHA-2 and SHA-3\". arXiv:1603.09383 (https://arxiv.org/abs/1603.09383) [quant-ph (https://a rxiv.org/archive/quant-ph)]. 100. Dyakonov, M. I. (14 October 2006). S. Luryi; Xu, J.; Zaslavsky, A. (eds.). \"Is Fault-Tolerant",
                "umap_x": 2.3507273197174072,
                "umap_y": 0.026972409337759018,
                "color": "#BCBD22"
            },
            {
                "text": "Quantum Computation Really Possible?\". Future Trends in Microelectronics. Up the Nano",
                "umap_x": 0.684285581111908,
                "umap_y": 0.9195855855941772,
                "color": "#BCBD22"
            },
            {
                "text": "Creek: 4–18. arXiv:quant-ph/0610117 (https://arxiv.org/abs/quant-ph/0610117).",
                "umap_x": 5.413691997528076,
                "umap_y": 5.009868621826172,
                "color": "#BCBD22"
            },
            {
                "text": "Bibcode:2006quant.ph.10117D (https://ui.adsabs.harvard.edu/abs/2006quant.ph.10117D). 101. Ahsan, Muhammad (2015). Architecture Framework for Trapped-ion Quantum Computer based on Performance Simulation Tool (http://worldcat.org/oclc/923881411).",
                "umap_x": 0.7215973734855652,
                "umap_y": 0.09833256155252457,
                "color": "#BCBD22"
            },
            {
                "text": "OCLC 923881411 (https://search.worldcat.org/oclc/923881411). 102. Ahsan, Muhammad; Meter, Rodney Van; Kim, Jungsang (28 December 2016). \"Designing a",
                "umap_x": 6.508756637573242,
                "umap_y": 3.158970594406128,
                "color": "#BCBD22"
            },
            {
                "text": "Million-Qubit Quantum Computer Using a Resource Performance Simulator\" (https://doi.org/ 10.1145%2F2830570). ACM Journal on Emerging Technologies in Computing Systems. 12 (4): 39:1–39:25. arXiv:1512.00796 (https://arxiv.org/abs/1512.00796). doi:10.1145/2830570 (https://doi.org/10.1145%2F2830570). ISSN 1550-4832 (https://search.worldcat.org/issn/15 50-4832). S2CID 1258374 (https://api.semanticscholar.org/CorpusID:1258374). 103. Gidney, Craig; Ekerå, Martin (15 April 2021). \"How to factor 2048 bit RSA integers in 8 hours using 20 million noisy qubits\". Quantum. 5: 433. arXiv:1905.09749 (https://arxiv.org/abs/190 5.09749). Bibcode:2021Quant...5..433G (https://ui.adsabs.harvard.edu/abs/2021Quant...5.. 433G). doi:10.22331/q-2021-04-15-433 (https://doi.org/10.22331%2Fq-2021-04-15-433).",
                "umap_x": 1.2042534351348877,
                "umap_y": 0.9244096279144287,
                "color": "#BCBD22"
            },
            {
                "text": "ISSN 2521-327X (https://search.worldcat.org/issn/2521-327X). S2CID 162183806 (https://a pi.semanticscholar.org/CorpusID:162183806). 104. Freedman, Michael H.; Kitaev, Alexei; Larsen, Michael J.; Wang, Zhenghan (2003). \"Topological quantum computation\". Bulletin of the American Mathematical Society. 40 (1): 31–38. arXiv:quant-ph/0101025 (https://arxiv.org/abs/quant-ph/0101025). doi:10.1090/S0273-0979-02-00964-3 (https://doi.org/10.1090%2FS0273-0979-02-00964-3).",
                "umap_x": 3.368926525115967,
                "umap_y": 1.221837043762207,
                "color": "#BCBD22"
            },
            {
                "text": "MR 1943131 (https://mathscinet.ams.org/mathscinet-getitem?mr=1943131). 105. Monroe, Don (1 October 2008). \"Anyons: The breakthrough quantum computing needs?\" (ht tps://www.newscientist.com/channel/fundamentals/mg20026761.700-anyons-the-breakthrou gh-quantum-computing-needs.html). New Scientist. 106. Preskill, John (26 March 2012). \"Quantum computing and the entanglement frontier\". arXiv:1203.5813 (https://arxiv.org/abs/1203.5813) [quant-ph (https://arxiv.org/archive/quant- ph)]. 107. Preskill, John (6 August 2018). \"Quantum Computing in the NISQ era and beyond\" (https://d oi.org/10.22331%2Fq-2018-08-06-79). Quantum. 2: 79. arXiv:1801.00862 (https://arxiv.org/ abs/1801.00862). Bibcode:2018Quant...2...79P (https://ui.adsabs.harvard.edu/abs/2018Qua nt...2...79P). doi:10.22331/q-2018-08-06-79 (https://doi.org/10.22331%2Fq-2018-08-06-79). 108. Boixo, Sergio; Isakov, Sergei V.; Smelyanskiy, Vadim N.; Babbush, Ryan; Ding, Nan; et al. (2018). \"Characterizing Quantum Supremacy in Near-Term Devices\". Nature Physics. 14 (6): 595–600. arXiv:1608.00263 (https://arxiv.org/abs/1608.00263).",
                "umap_x": 2.6603875160217285,
                "umap_y": 0.35866835713386536,
                "color": "#BCBD22"
            },
            {
                "text": "Bibcode:2018NatPh..14..595B (https://ui.adsabs.harvard.edu/abs/2018NatPh..14..595B). doi:10.1038/s41567-018-0124-x (https://doi.org/10.1038%2Fs41567-018-0124-x).",
                "umap_x": 5.687288761138916,
                "umap_y": 5.945825576782227,
                "color": "#BCBD22"
            },
            {
                "text": "S2CID 4167494 (https://api.semanticscholar.org/CorpusID:4167494). 109. Savage, Neil (5 July 2017). \"Quantum Computers Compete for \"Supremacy\" \" (https://www.s cientificamerican.com/article/quantum-computers-compete-for-supremacy/). Scientific",
                "umap_x": 2.578859329223633,
                "umap_y": -0.6951411366462708,
                "color": "#BCBD22"
            },
            {
                "text": "American. 110. Giles, Martin (20 September 2019). \"Google researchers have reportedly achieved 'quantum supremacy' \" (https://www.technologyreview.com/f/614416/google-researchers-ha ve-reportedly-achieved-quantum-supremacy/). MIT Technology Review. Retrieved 15 May 2020. 111. Tavares, Frank (23 October 2019). \"Google and NASA Achieve Quantum Supremacy\" (http s://www.nasa.gov/feature/ames/quantum-supremacy). NASA. Retrieved 16 November 2021. 112. Pednault, Edwin; Gunnels, John A.; Nannicini, Giacomo; Horesh, Lior; Wisnieff, Robert (22",
                "umap_x": 2.400247812271118,
                "umap_y": -0.8658243417739868,
                "color": "#BCBD22"
            },
            {
                "text": "October 2019). \"Leveraging Secondary Storage to Simulate Deep 54-qubit Sycamore",
                "umap_x": 2.1346540451049805,
                "umap_y": -0.20504558086395264,
                "color": "#BCBD22"
            },
            {
                "text": "Circuits\". arXiv:1910.09534 (https://arxiv.org/abs/1910.09534) [quant-ph (https://arxiv.org/arc hive/quant-ph)]. 113. Cho, Adrian (23 October 2019). \"IBM casts doubt on Google's claims of quantum supremacy\" (https://www.science.org/'content'/article/ibm-casts-doubt-googles-claims-quantu m-supremacy). Science. doi:10.1126/science.aaz6080 (https://doi.org/10.1126%2Fscience. aaz6080). ISSN 0036-8075 (https://search.worldcat.org/issn/0036-8075). S2CID 211982610 (https://api.semanticscholar.org/CorpusID:211982610). 114. Liu, Yong (Alexander); Liu, Xin (Lucy); Li, Fang (Nancy); Fu, Haohuan; Yang, Yuling; et al. (14 November 2021). \"Closing the \"quantum supremacy\" gap\". Proceedings of the",
                "umap_x": 2.643190622329712,
                "umap_y": -0.7329958081245422,
                "color": "#BCBD22"
            },
            {
                "text": "International Conference for High Performance Computing, Networking, Storage and",
                "umap_x": 1.8872538805007935,
                "umap_y": -0.308453768491745,
                "color": "#BCBD22"
            },
            {
                "text": "Analysis. SC '21. New York, New York: Association for Computing Machinery. pp. 1–12. arXiv:2110.14502 (https://arxiv.org/abs/2110.14502). doi:10.1145/3458817.3487399 (https:// doi.org/10.1145%2F3458817.3487399). ISBN 978-1-4503-8442-1. S2CID 239036985 (http s://api.semanticscholar.org/CorpusID:239036985). 115. Bulmer, Jacob F. F.; Bell, Bryn A.; Chadwick, Rachel S.; Jones, Alex E.; Moise, Diana; et al. (28 January 2022). \"The boundary for quantum advantage in Gaussian boson sampling\" (htt ps://www.ncbi.nlm.nih.gov/pmc/articles/PMC8791606). Science Advances. 8 (4): eabl9236. arXiv:2108.01622 (https://arxiv.org/abs/2108.01622). Bibcode:2022SciA....8.9236B (https://u i.adsabs.harvard.edu/abs/2022SciA....8.9236B). doi:10.1126/sciadv.abl9236 (https://doi.org/ 10.1126%2Fsciadv.abl9236). ISSN 2375-2548 (https://search.worldcat.org/issn/2375-2548).",
                "umap_x": 3.0923867225646973,
                "umap_y": 0.9448988437652588,
                "color": "#BCBD22"
            },
            {
                "text": "PMC 8791606 (https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8791606). PMID 35080972 (https://pubmed.ncbi.nlm.nih.gov/35080972). 116. McCormick, Katie (10 February 2022). \"Race Not Over Between Classical and Quantum",
                "umap_x": 3.20436954498291,
                "umap_y": -0.5939119458198547,
                "color": "#BCBD22"
            },
            {
                "text": "Computers\" (https://physics.aps.org/articles/v15/19). Physics. 15: 19.",
                "umap_x": 3.692099094390869,
                "umap_y": 0.03930799290537834,
                "color": "#BCBD22"
            },
            {
                "text": "Bibcode:2022PhyOJ..15...19M (https://ui.adsabs.harvard.edu/abs/2022PhyOJ..15...19M). doi:10.1103/Physics.15.19 (https://doi.org/10.1103%2FPhysics.15.19). S2CID 246910085 (https://api.semanticscholar.org/CorpusID:246910085). 117. Pan, Feng; Chen, Keyang; Zhang, Pan (2022). \"Solving the Sampling Problem of the",
                "umap_x": 3.3981380462646484,
                "umap_y": 1.8051044940948486,
                "color": "#BCBD22"
            },
            {
                "text": "Sycamore Quantum Circuits\". Physical Review Letters. 129 (9): 090502. arXiv:2111.03011 (https://arxiv.org/abs/2111.03011). Bibcode:2022PhRvL.129i0502P (https://ui.adsabs.harvar d.edu/abs/2022PhRvL.129i0502P). doi:10.1103/PhysRevLett.129.090502 (https://doi.org/1 0.1103%2FPhysRevLett.129.090502). PMID 36083655 (https://pubmed.ncbi.nlm.nih.gov/36 083655). S2CID 251755796 (https://api.semanticscholar.org/CorpusID:251755796). 118. Cho, Adrian (2 August 2022). \"Ordinary computers can beat Google's quantum computer after all\" (https://www.science.org/'content'/article/ordinary-computers-can-beat-google-s-qua ntum-computer-after-all). Science. 377. doi:10.1126/science.ade2364 (https://doi.org/10.112 6%2Fscience.ade2364). 119. \"Google's 'quantum supremacy' usurped by researchers using ordinary supercomputer\" (htt ps://techcrunch.com/2022/08/05/googles-quantum-supremacy-usurped-by-researchers-usin g-ordinary-supercomputer/). TechCrunch. 5 August 2022. Retrieved 7 August 2022. 120. Ball, Philip (3 December 2020). \"Physicists in China challenge Google's 'quantum advantage' \". Nature. 588 (7838): 380. Bibcode:2020Natur.588..380B (https://ui.adsabs.harv ard.edu/abs/2020Natur.588..380B). doi:10.1038/d41586-020-03434-7 (https://doi.org/10.103 8%2Fd41586-020-03434-7). PMID 33273711 (https://pubmed.ncbi.nlm.nih.gov/33273711).",
                "umap_x": 2.4658851623535156,
                "umap_y": -0.5364004373550415,
                "color": "#BCBD22"
            },
            {
                "text": "S2CID 227282052 (https://api.semanticscholar.org/CorpusID:227282052). 121. Garisto, Daniel. \"Light-based Quantum Computer Exceeds Fastest Classical",
                "umap_x": 3.313530445098877,
                "umap_y": 0.4843747019767761,
                "color": "#BCBD22"
            },
            {
                "text": "Supercomputers\" (https://www.scientificamerican.com/article/light-based-quantum-computer -exceeds-fastest-classical-supercomputers/). Scientific American. Retrieved 7 December 2020. 122. Conover, Emily (3 December 2020). \"The new light-based quantum computer Jiuzhang has achieved quantum supremacy\" (https://www.sciencenews.org/article/new-light-based-quantu m-computer-jiuzhang-supremacy). Science News. Retrieved 7 December 2020. 123. Zhong, Han-Sen; Wang, Hui; Deng, Yu-Hao; Chen, Ming-Cheng; Peng, Li-Chao; et al. (3",
                "umap_x": 2.401078939437866,
                "umap_y": -0.42115628719329834,
                "color": "#BCBD22"
            },
            {
                "text": "December 2020). \"Quantum computational advantage using photons\". Science. 370 (6523): 1460–1463. arXiv:2012.01625 (https://arxiv.org/abs/2012.01625).",
                "umap_x": 2.6665115356445312,
                "umap_y": -0.3666978180408478,
                "color": "#BCBD22"
            },
            {
                "text": "Bibcode:2020Sci...370.1460Z (https://ui.adsabs.harvard.edu/abs/2020Sci...370.1460Z). doi:10.1126/science.abe8770 (https://doi.org/10.1126%2Fscience.abe8770). ISSN 0036- 8075 (https://search.worldcat.org/issn/0036-8075). PMID 33273064 (https://pubmed.ncbi.nl m.nih.gov/33273064). S2CID 227254333 (https://api.semanticscholar.org/CorpusID:227254 333). 124. Roberson, Tara M. (21 May 2020). \"{{subst:title case|Can hype be a force for good?}}\" (http s://doi.org/10.1177%2F0963662520923109). Public Understanding of Science. 29 (5): 544– 552. doi:10.1177/0963662520923109 (https://doi.org/10.1177%2F0963662520923109).",
                "umap_x": 6.062211036682129,
                "umap_y": 4.2716827392578125,
                "color": "#BCBD22"
            },
            {
                "text": "ISSN 0963-6625 (https://search.worldcat.org/issn/0963-6625). PMID 32438851 (https://pub med.ncbi.nlm.nih.gov/32438851). S2CID 218831653 (https://api.semanticscholar.org/Corpu sID:218831653). 125. Cavaliere, Fabio; Mattsson, John; Smeets, Ben (September 2020). \"The security implications of quantum cryptography and quantum computing\" (http://www.magonlinelibrar y.com/doi/10.1016/S1353-4858%2820%2930105-7). Network Security. 2020 (9): 9–15. doi:10.1016/S1353-4858(20)30105-7 (https://doi.org/10.1016%2FS1353-4858%2820%2930 105-7). ISSN 1353-4858 (https://search.worldcat.org/issn/1353-4858). S2CID 222349414 (h ttps://api.semanticscholar.org/CorpusID:222349414). 126. Liu, Yong; Chen, Yaojian; Guo, Chu; Song, Jiawei; Shi, Xinmin; Gan, Lin; Wu, Wenzhao;",
                "umap_x": 2.7737021446228027,
                "umap_y": 2.606552839279175,
                "color": "#BCBD22"
            },
            {
                "text": "Wu, Wei; Fu, Haohuan; Liu, Xin; Chen, Dexun; Zhao, Zhifeng; Yang, Guangwen; Gao,",
                "umap_x": 7.471253871917725,
                "umap_y": 3.8874080181121826,
                "color": "#BCBD22"
            },
            {
                "text": "Jiangang (16 January 2024). \"Verifying Quantum Advantage Experiments with Multiple",
                "umap_x": 3.424003839492798,
                "umap_y": 0.722556471824646,
                "color": "#BCBD22"
            },
            {
                "text": "Amplitude Tensor Network Contraction\" (https://link.aps.org/doi/10.1103/PhysRevLett.132.0 30601). Physical Review Letters. 132 (3): 030601. arXiv:2212.04749 (https://arxiv.org/abs/2 212.04749). Bibcode:2024PhRvL.132c0601L (https://ui.adsabs.harvard.edu/abs/2024PhRv",
                "umap_x": 4.67803430557251,
                "umap_y": 5.189661502838135,
                "color": "#BCBD22"
            },
            {
                "text": "L.132c0601L). doi:10.1103/PhysRevLett.132.030601 (https://doi.org/10.1103%2FPhysRevL ett.132.030601). ISSN 0031-9007 (https://search.worldcat.org/issn/0031-9007).",
                "umap_x": 4.9705491065979,
                "umap_y": 5.3431315422058105,
                "color": "#BCBD22"
            },
            {
                "text": "PMID 38307065 (https://pubmed.ncbi.nlm.nih.gov/38307065). 127. Monroe, Don (December 2022). \"Quantum Computers and the Universe\" (https://m-cacm.ac m.org/magazines/2022/12/266916-quantum-computers-and-the-universe/fulltext).",
                "umap_x": 3.5039424896240234,
                "umap_y": -0.1538383513689041,
                "color": "#BCBD22"
            },
            {
                "text": "Communications of the ACM. 128. Swayne, Matt (20 June 2023). \"PsiQuantum Sees 700x Reduction in Computational",
                "umap_x": 3.268378496170044,
                "umap_y": 0.3736536204814911,
                "color": "#BCBD22"
            },
            {
                "text": "Resource Requirements to Break Elliptic Curve Cryptography With a Fault Tolerant",
                "umap_x": 2.2813124656677246,
                "umap_y": 0.16130907833576202,
                "color": "#BCBD22"
            },
            {
                "text": "Quantum Computer\" (https://thequantuminsider.com/2023/06/20/psiquantum-sees-700x-red uction-in-computational-resource-requirements-to-break-elliptic-curve-cryptography-with-a-f ault-tolerant-quantum-computer/). The Quanrum Insider. 129. Unruh, Bill (1995). \"Maintaining coherence in Quantum Computers\". Physical Review A. 51 (2): 992–997. arXiv:hep-th/9406058 (https://arxiv.org/abs/hep-th/9406058).",
                "umap_x": 2.5607833862304688,
                "umap_y": 0.05723577365279198,
                "color": "#BCBD22"
            },
            {
                "text": "Bibcode:1995PhRvA..51..992U (https://ui.adsabs.harvard.edu/abs/1995PhRvA..51..992U). doi:10.1103/PhysRevA.51.992 (https://doi.org/10.1103%2FPhysRevA.51.992).",
                "umap_x": 5.259149074554443,
                "umap_y": 5.658613681793213,
                "color": "#BCBD22"
            },
            {
                "text": "PMID 9911677 (https://pubmed.ncbi.nlm.nih.gov/9911677). S2CID 13980886 (https://api.se manticscholar.org/CorpusID:13980886). 130. Davies, Paul (6 March 2007). \"The implications of a holographic universe for quantum information science and the nature of physical law\". arXiv:quant-ph/0703041 (https://arxiv.or g/abs/quant-ph/0703041). 131. Regan, K. W. (23 April 2016). \"Quantum Supremacy and Complexity\" (https://rjlipton.wordpr ess.com/2016/04/22/quantum-supremacy-and-complexity/). Gödel's Lost Letter and P=NP. 132. Kalai, Gil (May 2016). \"The Quantum Computer Puzzle\" (https://www.ams.org/journals/notic es/201605/rnoti-p508.pdf) (PDF). Notices of the AMS. 63 (5): 508–516. 133. Rinott, Yosef; Shoham, Tomer; Kalai, Gil (13 July 2021). \"Statistical Aspects of the Quantum",
                "umap_x": 3.087005853652954,
                "umap_y": -0.5268157124519348,
                "color": "#BCBD22"
            },
            {
                "text": "Supremacy Demonstration\". arXiv:2008.05177 (https://arxiv.org/abs/2008.05177) [quant-ph (https://arxiv.org/archive/quant-ph)]. 134. Dyakonov, Mikhail (15 November 2018). \"The Case Against Quantum Computing\" (https://sp ectrum.ieee.org/the-case-against-quantum-computing). IEEE Spectrum. Retrieved 3 December 2019. 135. Dyakonov, Mikhail (24 March 2020). Will We Ever Have a Quantum Computer? (https://ww w.springer.com/gp/book/9783030420185). Springer. ISBN 9783030420185. Retrieved 22 May 2020. 136. Russell, John (10 January 2019). \"IBM Quantum Update: Q System One Launch, New",
                "umap_x": 2.6535956859588623,
                "umap_y": -0.23599079251289368,
                "color": "#BCBD22"
            },
            {
                "text": "Collaborators, and QC Center Plans\" (https://www.hpcwire.com/2019/01/10/ibm-quantum-up date-q-system-one-launch-new-collaborators-and-qc-center-plans/). HPCwire. Retrieved 9 January 2023. 137. Tacchino, Francesco; Chiesa, Alessandro; Carretta, Stefano; Gerace, Dario (19 December 2019). \"Quantum Computers as Universal Quantum Simulators: State-of-the-Art and",
                "umap_x": 2.363255023956299,
                "umap_y": -0.30377089977264404,
                "color": "#BCBD22"
            },
            {
                "text": "Perspectives\" (https://onlinelibrary.wiley.com/doi/10.1002/qute.201900052). Advanced",
                "umap_x": 5.919020175933838,
                "umap_y": 4.814061164855957,
                "color": "#BCBD22"
            },
            {
                "text": "Quantum Technologies. 3 (3): 1900052. arXiv:1907.03505 (https://arxiv.org/abs/1907.0350 5). doi:10.1002/qute.201900052 (https://doi.org/10.1002%2Fqute.201900052). ISSN 2511- 9044 (https://search.worldcat.org/issn/2511-9044). S2CID 195833616 (https://api.semantics cholar.org/CorpusID:195833616). 138. Grumbling & Horowitz 2019, p. 127. 139. Grumbling & Horowitz 2019, p. 114. 140. Grumbling & Horowitz 2019, p. 119. 141. Grumbling & Horowitz 2019, p. 126. 142. Mackie, Kurt (8 February 2024). \"Microsoft Quantum Computing Getting DARPA Funding\" (h ttps://rcpmag.com/Articles/2024/02/08/Microsoft-Quantum-Computing-DARPA.aspx). rcpmag.com. Retrieved 9 February 2024. 143. Gent, Edd (5 July 2023). \"Microsoft Wants to Build a Quantum Supercomputer Within a",
                "umap_x": 2.8217408657073975,
                "umap_y": 0.6501505374908447,
                "color": "#BCBD22"
            },
            {
                "text": "Decade\" (https://singularityhub.com/2023/07/05/microsoft-plans-to-build-a-quantum-superco mputer-within-a-decade/). Singularity Hub. Retrieved 18 October 2024. 144. Lucian Armasu (22 November 2016). \"Microsoft Aims To Create World's First Topological",
                "umap_x": 2.915140390396118,
                "umap_y": -0.28859975934028625,
                "color": "#BCBD22"
            },
            {
                "text": "Quantum Computer\" (https://www.tomshardware.com/news/microsoft-first-topological-quant um-computer,33068.html). Tom's Hardware. Retrieved 18 October 2024. 145. Nayak, Chetan (19 February 2025). \"Microsoft unveils Majorana 1, the world's first quantum processor powered by topological qubits\" (https://azure.microsoft.com/en-us/blog/quantum/2 025/02/19/microsoft-unveils-majorana-1-the-worlds-first-quantum-processor-powered-by-top ological-qubits/). Microsoft Azure Quantum Blog. Retrieved 20 February 2025. 146. Leong, Kelvin; Sung, Anna (November 2022). \"What Business Managers Should Know",
                "umap_x": 2.8853349685668945,
                "umap_y": -0.3030635416507721,
                "color": "#BCBD22"
            },
            {
                "text": "About Quantum Computing?\" (http://journalofinterdisciplinarysciences.com/wp-'content'/uploa ds/2022/10/3-What-Business-Managers-Should-Know-About-Quantum-Computing.pdf) (PDF). Journal of Interdisciplinary Sciences. Retrieved 13 August 2023. 147. Gibney, Elizabeth (2 October 2019). \"Quantum gold rush: the private funding pouring into quantum start-ups\". Nature. 574 (7776): 22–24. Bibcode:2019Natur.574...22G (https://ui.ads abs.harvard.edu/abs/2019Natur.574...22G). doi:10.1038/d41586-019-02935-4 (https://doi.or g/10.1038%2Fd41586-019-02935-4). PMID 31578480 (https://pubmed.ncbi.nlm.nih.gov/315 78480). S2CID 203626236 (https://api.semanticscholar.org/CorpusID:203626236). 148. Rodrigo, Chris Mills (12 February 2020). \"Trump budget proposal boosts funding for artificial intelligence, quantum computing\" (https://thehill.com/policy/technology/482402-trump-budge t-proposal-boosts-funding-for-artificial-intelligence-quantum). The Hill. Retrieved 11 July 2021. 149. Biondi, Matteo; Heid, Anna; Henke, Nicolaus; Mohr, Niko; Pautasso, Lorenzo; et al. (14",
                "umap_x": 2.903413772583008,
                "umap_y": 0.08451984822750092,
                "color": "#BCBD22"
            },
            {
                "text": "December 2021). \"Quantum computing use cases are getting real—what you need to know\" (https://www.mckinsey.com/business-functions/mckinsey-digital/our-insights/quantum-comp uting-use-cases-are-getting-real-what-you-need-to-know). McKinsey & Company. Retrieved 1 April 2022. 150. Nielsen & Chuang 2010, p. 29. 151. Nielsen & Chuang 2010, p. 126. 152. Nielsen & Chuang 2010, p. 41. 153. Nielsen & Chuang 2010, p. 201. 154. Bernstein, Ethan; Vazirani, Umesh (1997). \"Quantum Complexity Theory\" (http://www.cs.ber keley.edu/~vazirani/bv.ps). SIAM Journal on Computing. 26 (5): 1411–1473.",
                "umap_x": 3.0435211658477783,
                "umap_y": -0.15697932243347168,
                "color": "#BCBD22"
            },
            {
                "text": "CiteSeerX 10.1.1.144.7852 (https://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.144. 7852). doi:10.1137/S0097539796300921 (https://doi.org/10.1137%2FS009753979630092 1).",
                "umap_x": 5.671813011169434,
                "umap_y": 5.633635520935059,
                "color": "#BCBD22"
            }
        ],
        "color": "#BCBD22",
        "length": 152
    },
    "Sources": {
        "umap_values": [
            {
                "text": "Aaronson, Scott (2013). Quantum Computing Since Democritus. Cambridge University",
                "umap_x": 4.404345989227295,
                "umap_y": 0.24877238273620605,
                "color": "#17BECF"
            },
            {
                "text": "Press. doi:10.1017/CBO9780511979309 (https://doi.org/10.1017%2FCBO9780511979309).",
                "umap_x": 5.687187194824219,
                "umap_y": 5.218937873840332,
                "color": "#17BECF"
            },
            {
                "text": "ISBN 978-0-521-19956-8. OCLC 829706638 (https://search.worldcat.org/oclc/829706638).",
                "umap_x": 6.298770427703857,
                "umap_y": 2.663235902786255,
                "color": "#17BECF"
            },
            {
                "text": "Grumbling, Emily; Horowitz, Mark, eds. (2019). Quantum Computing: Progress and",
                "umap_x": 4.535480976104736,
                "umap_y": 0.6354182958602905,
                "color": "#17BECF"
            },
            {
                "text": "Prospects. Washington, DC: The National Academies Press. doi:10.17226/25196 (https://do i.org/10.17226%2F25196). ISBN 978-0-309-47970-7. OCLC 1091904777 (https://search.wo rldcat.org/oclc/1091904777). S2CID 125635007 (https://api.semanticscholar.org/CorpusID:1 25635007).",
                "umap_x": 6.355422019958496,
                "umap_y": 3.522979974746704,
                "color": "#17BECF"
            },
            {
                "text": "Mermin, N. David (2007). Quantum Computer Science: An Introduction. doi:10.1017/CBO9780511813870 (https://doi.org/10.1017%2FCBO9780511813870).",
                "umap_x": 4.4283447265625,
                "umap_y": 0.8889657258987427,
                "color": "#17BECF"
            },
            {
                "text": "ISBN 978-0-511-34258-5. OCLC 422727925 (https://search.worldcat.org/oclc/422727925).",
                "umap_x": 6.279762268066406,
                "umap_y": 2.6490345001220703,
                "color": "#17BECF"
            },
            {
                "text": "Nielsen, Michael; Chuang, Isaac (2010). Quantum Computation and Quantum Information (10th anniversary ed.). doi:10.1017/CBO9780511976667 (https://doi.org/10.1017%2FCBO9 780511976667). ISBN 978-0-511-99277-3. OCLC 700706156 (https://search.worldcat.org/o clc/700706156). S2CID 59717455 (https://api.semanticscholar.org/CorpusID:59717455).",
                "umap_x": 4.58667516708374,
                "umap_y": 1.5124815702438354,
                "color": "#17BECF"
            },
            {
                "text": "Shor, Peter W. (1994). Algorithms for Quantum Computation: Discrete Logarithms and",
                "umap_x": 3.866941213607788,
                "umap_y": 1.1912868022918701,
                "color": "#17BECF"
            },
            {
                "text": "Factoring. Symposium on Foundations of Computer Science. Santa Fe, New Mexico: IEEE. pp. 124–134. doi:10.1109/SFCS.1994.365700 (https://doi.org/10.1109%2FSFCS.1994.3657 00). ISBN 978-0-8186-6580-6.",
                "umap_x": 4.300556659698486,
                "umap_y": 2.502063274383545,
                "color": "#17BECF"
            }
        ],
        "color": "#17BECF",
        "length": 10
    },
    "Further reading": {
        "umap_values": [
            {
                "text": "Akama, Seiki (2014). Elements of Quantum Computing: History, Theories and Engineering",
                "umap_x": 4.374557018280029,
                "umap_y": 0.3543730080127716,
                "color": "#AEC7E8"
            },
            {
                "text": "Applications. Springer. doi:10.1007/978-3-319-08284-4 (https://doi.org/10.1007%2F978-3-3 19-08284-4). ISBN 978-3-319-08284-4. OCLC 884786739 (https://search.worldcat.org/oclc/ 884786739).",
                "umap_x": 6.0007123947143555,
                "umap_y": 2.659198045730591,
                "color": "#AEC7E8"
            },
            {
                "text": "Benenti, Giuliano; Casati, Giulio; Rossini, Davide; Strini, Giuliano (2019). Principles of",
                "umap_x": 7.5505805015563965,
                "umap_y": 3.9730958938598633,
                "color": "#AEC7E8"
            },
            {
                "text": "Quantum Computation and Information: A Comprehensive Textbook (2nd ed.). doi:10.1142/10909 (https://doi.org/10.1142%2F10909). ISBN 978-981-3237-23-0.",
                "umap_x": 4.758081912994385,
                "umap_y": 1.2999986410140991,
                "color": "#AEC7E8"
            },
            {
                "text": "OCLC 1084428655 (https://search.worldcat.org/oclc/1084428655). S2CID 62280636 (http s://api.semanticscholar.org/CorpusID:62280636).",
                "umap_x": 6.510015964508057,
                "umap_y": 3.56453800201416,
                "color": "#AEC7E8"
            },
            {
                "text": "Bernhardt, Chris (2019). Quantum Computing for Everyone. MIT Press. ISBN 978-0-262- 35091-4. OCLC 1082867954 (https://search.worldcat.org/oclc/1082867954).",
                "umap_x": 5.363604545593262,
                "umap_y": 1.5427395105361938,
                "color": "#AEC7E8"
            },
            {
                "text": "Hidary, Jack D. (2021). Quantum Computing: An Applied Approach (2nd ed.). doi:10.1007/978-3-030-83274-2 (https://doi.org/10.1007%2F978-3-030-83274-2). ISBN 978- 3-03-083274-2. OCLC 1272953643 (https://search.worldcat.org/oclc/1272953643).",
                "umap_x": 4.484976291656494,
                "umap_y": 1.0469423532485962,
                "color": "#AEC7E8"
            },
            {
                "text": "S2CID 238223274 (https://api.semanticscholar.org/CorpusID:238223274).",
                "umap_x": 6.743719577789307,
                "umap_y": 3.8007571697235107,
                "color": "#AEC7E8"
            },
            {
                "text": "Hiroshi, Imai; Masahito, Hayashi, eds. (2006). Quantum Computation and Information: From",
                "umap_x": 4.400343418121338,
                "umap_y": 1.021256446838379,
                "color": "#AEC7E8"
            },
            {
                "text": "Theory to Experiment. Topics in Applied Physics. Vol. 102. doi:10.1007/3-540-33133-6 (http s://doi.org/10.1007%2F3-540-33133-6). ISBN 978-3-540-33133-9.",
                "umap_x": 4.846671104431152,
                "umap_y": 1.823928952217102,
                "color": "#AEC7E8"
            },
            {
                "text": "Hughes, Ciaran; Isaacson, Joshua; Perry, Anastasia; Sun, Ranbel F.; Turner, Jessica (2021). Quantum Computing for the Quantum Curious (https://link.springer.com/book/10.100 7/978-3-030-61601-4). doi:10.1007/978-3-030-61601-4 (https://doi.org/10.1007%2F978-3-0 30-61601-4). ISBN 978-3-03-061601-4. OCLC 1244536372 (https://search.worldcat.org/ocl c/1244536372). S2CID 242566636 (https://api.semanticscholar.org/CorpusID:242566636).",
                "umap_x": 4.580041885375977,
                "umap_y": 1.4609612226486206,
                "color": "#AEC7E8",
            },
            {
                "text": "Jaeger, Gregg (2007). Quantum Information: An Overview. doi:10.1007/978-0-387-36944-0 (https://doi.org/10.1007%2F978-0-387-36944-0). ISBN 978-0-387-36944-0.",
                "umap_x": 4.846635341644287,
                "color": "#AEC7E8",
                "umap_y": 1.4642906188964844,

                
            },
            {
                "text": "OCLC 186509710 (https://search.worldcat.org/oclc/186509710).",
                "umap_x": 6.472059726715088,
                "color": "#AEC7E8",
                "umap_y": 3.1956026554107666
            },
            {
                "text": "Johnston, Eric R.; Harrigan, Nic; Gimeno-Segovia, Mercedes (2019). Programming",
                "umap_x": 7.4834699630737305,
                "color": "#AEC7E8",
                "umap_y": 4.028132438659668
            },
            {
                "text": "Quantum Computers: Essential Algorithms and Code Samples. O'Reilly Media,",
                "umap_x": 4.232470989227295,
                "color": "#AEC7E8",
                "umap_y": 0.28983166813850403
            },
            {
                "text": "Incorporated. ISBN 978-1-4920-3968-6. OCLC 1111634190 (https://search.worldcat.org/ocl c/1111634190).",
                "umap_x": 6.268041133880615,
                "color": "#AEC7E8",
                "umap_y": 2.7136805057525635
            },
            {
                "text": "Kaye, Phillip; Laflamme, Raymond; Mosca, Michele (2007). An Introduction to Quantum",
                "umap_x": 5.051326274871826,
                "color": "#AEC7E8",
                "umap_y": 0.7683895826339722
            },
            {
                "text": "Computing. OUP Oxford. ISBN 978-0-19-857000-4. OCLC 85896383 (https://search.worldc at.org/oclc/85896383).",
                "umap_x": 5.630499839782715,
                "color": "#AEC7E8",
                "umap_y": 2.3565919399261475
            },
            {
                "text": "Kitaev, Alexei Yu.; Shen, Alexander H.; Vyalyi, Mikhail N. (2002). Classical and Quantum",
                "umap_x": 5.120753765106201,
                "color": "#AEC7E8",
                "umap_y": 0.8403388857841492
            },
            {
                "text": "Computation. American Mathematical Soc. ISBN 978-0-8218-3229-5. OCLC 907358694 (htt ps://search.worldcat.org/oclc/907358694).",
                "umap_x": 4.677964687347412,
                "color": "#AEC7E8",
                "umap_y": 2.129140615463257
            },
            {
                "text": "Kurgalin, Sergei; Borzunov, Sergei (2021). Concise Guide to Quantum Computing:",
                "umap_x": 4.581392288208008,
                "color": "#AEC7E8",
                "umap_y": 0.6830695271492004
            },
            {
                "text": "Algorithms, Exercises, and Implementations (https://dx.doi.org/10.1007/978-3-030-65052-0).",
                "umap_x": 4.157820701599121,
                "color": "#AEC7E8",
                "umap_y": 2.127847194671631
            },
            {
                "text": "Springer. doi:10.1007/978-3-030-65052-0 (https://doi.org/10.1007%2F978-3-030-65052-0).",
                "umap_x": 5.706902503967285,
                "color": "#AEC7E8",
                "umap_y": 5.049324035644531
            },
            {
                "text": "ISBN 978-3-030-65052-0.",
                "umap_x": 6.255533218383789,
                "color": "#AEC7E8",
                "umap_y": 2.5799753665924072
            },
            {
                "text": "Stolze, Joachim; Suter, Dieter (2004). Quantum Computing: A Short Course from Theory to",
                "umap_x": 4.657051086425781,
                "color": "#AEC7E8",
                "umap_y": 0.8302428722381592
            },
            {
                "text": "Experiment. doi:10.1002/9783527617760 (https://doi.org/10.1002%2F9783527617760).",
                "umap_x": 5.553145885467529,
                "color": "#AEC7E8",
                "umap_y": 4.924943447113037
            },
            {
                "text": "ISBN 978-3-527-61776-0. OCLC 212140089 (https://search.worldcat.org/oclc/212140089).",
                "umap_x": 6.187619686126709,
                "color": "#AEC7E8",
                "umap_y": 2.5720813274383545
            },
            {
                "text": "Susskind, Leonard; Friedman, Art (2014). Quantum Mechanics: The Theoretical Minimum.",
                "umap_x": 4.882029056549072,
                "color": "#AEC7E8",
                "umap_y": 0.6762413382530212
            },
            {
                "text": "New York: Basic Books. ISBN 978-0-465-08061-8.",
                "umap_x": 6.371916770935059,
                "color": "#AEC7E8",
                "umap_y": 2.573723554611206
            },
            {
                "text": "Wichert, Andreas (2020). Principles of Quantum Artificial Intelligence: Quantum Problem",
                "umap_x": 4.873617649078369,
                "color": "#AEC7E8",
                "umap_y": 0.5422024130821228
            },
            {
                "text": "Solving and Machine Learning (2nd ed.). doi:10.1142/11938 (https://doi.org/10.1142%2F11 938). ISBN 978-981-12-2431-7. OCLC 1178715016 (https://search.worldcat.org/oclc/11787 15016). S2CID 225498497 (https://api.semanticscholar.org/CorpusID:225498497).",
                "umap_x": 5.008024215698242,
                "color": "#AEC7E8",
                "umap_y": 2.1867122650146484
            },
            {
                "text": "Wong, Thomas (2022). Introduction to Classical and Quantum Computing (https://web.archi ve.org/web/20220129214631/http://www.thomaswong.net/introduction-to-classical-and-quan tum-computing-1e.pdf) (PDF). Rooted Grove. ISBN 979-8-9855931-0-5. OCLC 1308951401 (https://search.worldcat.org/oclc/1308951401). Archived from the original (http://www.thoma swong.net/introduction-to-classical-and-quantum-computing-1e.pdf) (PDF) on 29 January 2022. Retrieved 6 February 2022.",
                "umap_x": 4.396630764007568,
                "color": "#AEC7E8",
                "umap_y": 1.1018481254577637
            },
            {
                "text": "Zeng, Bei; Chen, Xie; Zhou, Duan-Lu; Wen, Xiao-Gang (2019). Quantum Information Meets",
                "umap_x": 3.756976842880249,
                "color": "#AEC7E8",
                "umap_y": 1.5426284074783325
            },
            {
                "text": "Quantum Matter. arXiv:1508.02595 (https://arxiv.org/abs/1508.02595). doi:10.1007/978-1- 4939-9084-9 (https://doi.org/10.1007%2F978-1-4939-9084-9). ISBN 978-1-4939-9084-9.",
                "umap_x": 4.8668599128723145,
                "color": "#AEC7E8",
                "umap_y": 1.501981258392334
            },
            {
                "text": "OCLC 1091358969 (https://search.worldcat.org/oclc/1091358969). S2CID 118528258 (http s://api.semanticscholar.org/CorpusID:118528258).",
                "umap_x": 6.52115535736084,
                "color": "#AEC7E8",
                "umap_y": 3.488741397857666
            },
            {
                "text": "Abbot, Derek; Doering, Charles R.; Caves, Carlton M.; Lidar, Daniel M.; Brandt, Howard E.; et al. (2003). \"Dreams versus Reality: Plenary Debate Session on Quantum Computing\".",
                "umap_x": 4.181042671203613,
                "color": "#AEC7E8",
                "umap_y": 0.05580815672874451
            },
            {
                "text": "Quantum Information Processing. 2 (6): 449–472. arXiv:quant-ph/0310130 (https://arxiv.org/ abs/quant-ph/0310130). Bibcode:2003QuIP....2..449A (https://ui.adsabs.harvard.edu/abs/20 03QuIP....2..449A). doi:10.1023/B:QINP.0000042203.24782.9a (https://doi.org/10.1023%2F",
                "umap_x": 3.3569045066833496,
                "color": "#AEC7E8",
                "umap_y": 1.7139087915420532
            },
            {
                "text": "B%3AQINP.0000042203.24782.9a). hdl:2027.42/45526 (https://hdl.handle.net/2027.42%2F 45526). S2CID 34885835 (https://api.semanticscholar.org/CorpusID:34885835).",
                "umap_x": 6.578002452850342,
                "color": "#AEC7E8",
                "umap_y": 3.9319236278533936
            },
            {
                "text": "Berthiaume, Andre (1 December 1998). \"Quantum Computation\". Solution Manual for",
                "umap_x": 3.988476276397705,
                "color": "#AEC7E8",
                "umap_y": 1.0695781707763672
            },
            {
                "text": "Quantum Mechanics. pp. 233–234. doi:10.1142/9789814541893_0016 (https://doi.org/10.11 42%2F9789814541893_0016). ISBN 978-981-4541-88-6. S2CID 128255429 (https://api.se manticscholar.org/CorpusID:128255429) – via Semantic Scholar.",
                "umap_x": 4.962272644042969,
                "color": "#AEC7E8",
                "umap_y": 1.737610101699829
            },
            {
                "text": "Academic papers",
                "umap_x": 5.899515151977539,
                "color": "#AEC7E8",
                "umap_y": 2.5332181453704834
            },
            {
                "text": "DiVincenzo, David P. (2000). \"The Physical Implementation of Quantum Computation\".",
                "umap_x": 4.086111545562744,
                "color": "#AEC7E8",
                "umap_y": 0.419808566570282
            },
            {
                "text": "Fortschritte der Physik. 48 (9–11): 771–783. arXiv:quant-ph/0002077 (https://arxiv.org/abs/q uant-ph/0002077). Bibcode:2000ForPh..48..771D (https://ui.adsabs.harvard.edu/abs/2000F orPh..48..771D). doi:10.1002/1521-3978(200009)48:9/11<771::AID-PROP771>3.0.CO;2-E (https://doi.org/10.1002%2F1521-3978%28200009%2948%3A9%2F11%3C771%3A%3AAI",
                "umap_x": 5.0189008712768555,
                "color": "#AEC7E8",
                "umap_y": 5.30881404876709
            },
            {
                "text": "D-PROP771%3E3.0.CO%3B2-E). S2CID 15439711 (https://api.semanticscholar.org/Corpus",
                "umap_x": 6.699771404266357,
                "color": "#AEC7E8",
                "umap_y": 3.901045799255371
            },
            {
                "text": "ID:15439711).",
                "umap_x": 6.893933296203613,
                "color": "#AEC7E8",
                "umap_y": 4.068099498748779
            },
            {
                "text": "DiVincenzo, David P. (1995). \"Quantum Computation\". Science. 270 (5234): 255–261.",
                "umap_x": 3.7132434844970703,
                "color": "#AEC7E8",
                "umap_y": 0.8263815641403198
            },
            {
                "text": "Bibcode:1995Sci...270..255D (https://ui.adsabs.harvard.edu/abs/1995Sci...270..255D).",
                "umap_x": 5.704991817474365,
                "color": "#AEC7E8",
                "umap_y": 6.141305923461914
            },
            {
                "text": "CiteSeerX 10.1.1.242.2165 (https://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.242. 2165). doi:10.1126/science.270.5234.255 (https://doi.org/10.1126%2Fscience.270.5234.25 5). S2CID 220110562 (https://api.semanticscholar.org/CorpusID:220110562). Table 1 lists switching and dephasing times for various systems.",
                "umap_x": 1.3146679401397705,
                "color": "#AEC7E8",
                "umap_y": 0.5825652480125427
            },
            {
                "text": "Jeutner, Valentin (2021). \"The Quantum Imperative: Addressing the Legal Dimension of",
                "umap_x": 5.058577060699463,
                "color": "#AEC7E8",
                "umap_y": 0.6744027733802795
            },
            {
                "text": "Quantum Computers\" (https://lup.lub.lu.se/record/e034e7b7-d17c-4863-9cee-7e654f97225 b). Morals & Machines. 1 (1): 52–59. doi:10.5771/2747-5174-2021-1-52 (https://doi.org/10.5 771%2F2747-5174-2021-1-52). S2CID 236664155 (https://api.semanticscholar.org/CorpusI",
                "umap_x": 3.1649084091186523,
                "color": "#AEC7E8",
                "umap_y": 0.30686935782432556
            },
            {
                "text": "D:236664155).",
                "umap_x": 6.913793087005615,
                "color": "#AEC7E8",
                "umap_y": 4.275446891784668
            },
            {
                "text": "Krantz, P.; Kjaergaard, M.; Yan, F.; Orlando, T. P.; Gustavsson, S.; Oliver, W. D. (17 June 2019). \"A Quantum Engineer's Guide to Superconducting Qubits\". Applied Physics Reviews. 6 (2): 021318. arXiv:1904.06560 (https://arxiv.org/abs/1904.06560).",
                "umap_x": 1.1632393598556519,
                "color": "#AEC7E8",
                "umap_y": -0.20710594952106476
            },
            {
                "text": "Bibcode:2019ApPRv...6b1318K (https://ui.adsabs.harvard.edu/abs/2019ApPRv...6b1318K). doi:10.1063/1.5089550 (https://doi.org/10.1063%2F1.5089550). ISSN 1931-9401 (https://se arch.worldcat.org/issn/1931-9401). S2CID 119104251 (https://api.semanticscholar.org/Corp usID:119104251).",
                "umap_x": 5.763521194458008,
                "color": "#AEC7E8",
                "umap_y": 5.945935249328613
            },
            {
                "text": "Mitchell, Ian (1998). \"Computing Power into the 21st Century: Moore's Law and Beyond\" (htt p://citeseer.ist.psu.edu/mitchell98computing.html).",
                "umap_x": 3.966379404067993,
                "color": "#AEC7E8",
                "umap_y": 0.3676688075065613
            },
            {
                "text": "Simon, Daniel R. (1994). \"On the Power of Quantum Computation\" (http://citeseer.ist.psu.ed u/simon94power.html). Institute of Electrical and Electronics Engineers Computer Society",
                "umap_x": 4.073585033416748,
                "color": "#AEC7E8",
                "umap_y": 0.6239738464355469
            }
        ],
        "color": "#AEC7E8",
        "length": 55
    },
    "External links": {
        "umap_values": [
            {
                "text": "Media related to Quantum computer at Wikimedia Commons",
                "umap_x": 4.135616302490234,
                "umap_y": 0.12633489072322845,
                "color": "#FF9896"
            },
            {
                "text": "Learning materials related to Quantum computing at Wikiversity",
                "umap_x": 4.545831680297852,
                "umap_y": 0.7432851791381836,
                "color": "#FF9896"
            },
            {
                "text": "Stanford Encyclopedia of Philosophy: \"Quantum Computing (https://plato.stanford.edu/entrie s/qt-quantcomp/)\" by Amit Hagar and Michael E. Cuffaro. \"Quantum computation, theory of\" (https://www.encyclopediaofmath.org/index.php?title=Qua ntum_computation,_theory_of), Encyclopedia of Mathematics, EMS Press, 2001 [1994]",
                "umap_x": 4.719629287719727,
                "umap_y": 1.012636423110962,
                "color": "#FF9896"
            },
            {
                "text": "Lectures",
                "umap_x": 5.784593105316162,
                "umap_y": 1.6831008195877075,
                "color": "#FF9896"
            },
            {
                "text": "Quantum computing for the determined (https://www.youtube.com/playlist?list=PL1826E60F",
                "umap_x": 4.317319393157959,
                "umap_y": 0.3397698998451233,
                "color": "#FF9896"
            },
            {
                "text": "D05B44E4) – 22 video lectures by Michael Nielsen",
                "umap_x": 5.780614376068115,
                "umap_y": 1.6232959032058716,
                "color": "#FF9896"
            },
            {
                "text": "Video Lectures (http://www.quiprocone.org/Protected/DD_lectures.htm) by David Deutsch",
                "umap_x": 5.813137054443359,
                "umap_y": 1.7500306367874146,
                "color": "#FF9896"
            },
            {
                "text": "Lomonaco, Sam. Four Lectures on Quantum Computing given at Oxford University in July 2006 (http://www.csee.umbc.edu/~lomonaco/Lectures.html#OxfordLectures)",
                "umap_x": 4.697039604187012,
                "umap_y": 0.6929422616958618,
                "color": "#FF9896"
            },
            {
                "text": "Retrieved from \"https://en.wikipedia.org/w/index.php?title=Quantum_computing&oldid=1276772487\"",
                "umap_x": 3.630791425704956,
                "umap_y": 0.4629928171634674,
                "color": "#FF9896"
            }
        ],
        "color": "#FF9896",
        "length": 9
    }
}